import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth';
import { templateDB, prisma } from '../../lib/database';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v19.0';
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

/**
 * Parse template component example field to extract variable parameters
 * WhatsApp API uses example.body_text, example.header_text, example.header_handle arrays
 * to indicate which variables are required
 */
export function parseComponentParameters(component: any): any[] {
  // If no example field, component has no variables
  if (!component.example || typeof component.example !== 'object') {
    console.log(`Component ${component.type} has no example field`);
    return [];
  }

  const parameters: any[] = [];
  const example = component.example;
  const componentType = component.type?.toUpperCase();
  const componentText = component.text || '';
  
  // Debug logging
  console.log(`Parsing ${componentType} component:`, {
    hasExample: !!example,
    exampleKeys: Object.keys(example),
    body_text: example.body_text,
    header_text: example.header_text,
    header_handle: example.header_handle,
    componentText: componentText?.substring(0, 100)
  });

  // Handle BODY component variables
  // WhatsApp API can return body variables in different formats:
  // 1. body_text: Array of strings or nested arrays: ["example1", "example2"] or [["example1", "example2"]]
  // 2. body_text_named_params: Array of objects with param_name and example: [{param_name: "var_name", example: "value1"}]
  if (componentType === 'BODY') {
    // Check for body_text_named_params first (newer format with named parameters)
    if (example.body_text_named_params && Array.isArray(example.body_text_named_params)) {
      example.body_text_named_params.forEach((param: any, index: number) => {
        // Use param_name if available, otherwise fallback to extracting from text
        let label = `Variable ${index + 1}`;
        
        if (param.param_name) {
          // Use the actual parameter name from WhatsApp API
          // Convert snake_case to Title Case: "employee_name" -> "Employee Name"
          label = param.param_name
            .split('_')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        } else {
          // Fallback: try to extract from component text
          const variablePlaceholder = `{{${index + 1}}}`;
          if (componentText.includes(variablePlaceholder)) {
            const parts = componentText.split(variablePlaceholder);
            const beforeText = parts[0]?.trim() || '';
            const afterText = parts[1]?.trim() || '';
            
            if (beforeText) {
              const beforeWords = beforeText.split(/\s+/).filter((w: string) => w.length > 0);
              const meaningfulWords = beforeWords
                .slice(-3)
                .filter((w: string) => !['the', 'a', 'an', 'for', 'your', 'is', 'are', 'was', 'were', 'to', 'of', 'in', 'on', 'at', 'by'].includes(w.toLowerCase()));
              
              if (meaningfulWords.length > 0) {
                label = meaningfulWords.join(' ');
              } else if (beforeWords.length > 0) {
                label = beforeWords.slice(-2).join(' ');
              }
            }
            
            if (label === `Variable ${index + 1}` && afterText) {
              const afterWords = afterText.split(/\s+/).filter((w: string) => w.length > 0);
              if (afterWords.length > 0) {
                const firstWord = afterWords[0].toLowerCase();
                if (!['is', 'are', 'was', 'were', 'the', 'a', 'an', 'for', 'your'].includes(firstWord)) {
                  label = firstWord;
                }
              }
            }
            
            // Capitalize first letter of each word
            label = label.split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
          }
        }
        
        parameters.push({
          type: 'text',
          example: param.example || '',
          text: label,
          param_name: param.param_name || undefined, // Store param_name if available (for named parameters)
        });
      });
    }
    // Fallback to body_text (older format)
    else if (example.body_text) {
      let bodyExamples: string[] = [];
      if (Array.isArray(example.body_text)) {
        if (example.body_text.length > 0) {
          if (Array.isArray(example.body_text[0])) {
            bodyExamples = example.body_text[0] as string[];
          } else {
            bodyExamples = example.body_text as string[];
          }
        }
      }
      
      if (bodyExamples.length > 0) {
        bodyExamples.forEach((exampleValue: string, index: number) => {
          const variablePlaceholder = `{{${index + 1}}}`;
          let label = `Variable ${index + 1}`;
          
          if (componentText.includes(variablePlaceholder)) {
            const parts = componentText.split(variablePlaceholder);
            const beforeText = parts[0]?.trim() || '';
            
            if (beforeText) {
              const beforeWords = beforeText.split(/\s+/).filter((w: string) => w.length > 0);
              const meaningfulWords = beforeWords
                .slice(-3)
                .filter((w: string) => !['the', 'a', 'an', 'for', 'your', 'is', 'are', 'was', 'were', 'to', 'of', 'in', 'on', 'at', 'by'].includes(w.toLowerCase()));
              
              if (meaningfulWords.length > 0) {
                label = meaningfulWords.join(' ');
              } else if (beforeWords.length > 0) {
                label = beforeWords.slice(-2).join(' ');
              }
            }
          }
          
          label = label.split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
          
          parameters.push({
            type: 'text',
            example: exampleValue || '',
            text: label,
            // No param_name for indexed parameters ({{1}}, {{2}})
          });
        });
      }
    }
  }

  // Handle HEADER component variables
  if (componentType === 'HEADER') {
    const format = component.format?.toUpperCase();
    
    // HEADER with TEXT format
    if (format === 'TEXT' && example.header_text) {
      let headerExamples: string[] = [];
      
      if (Array.isArray(example.header_text)) {
        if (example.header_text.length > 0) {
          if (Array.isArray(example.header_text[0])) {
            headerExamples = example.header_text[0] as string[];
          } else {
            headerExamples = example.header_text as string[];
          }
        }
      }
      
      if (headerExamples.length > 0) {
        headerExamples.forEach((exampleValue: string, index: number) => {
          const variablePlaceholder = `{{${index + 1}}}`;
          let label = `Header Text ${index + 1}`;
          
          if (componentText.includes(variablePlaceholder)) {
            const parts = componentText.split(variablePlaceholder);
            const beforeText = parts[0]?.trim() || '';
            if (beforeText) {
              const beforeWords = beforeText.split(/\s+/).filter((w: string) => w.length > 0);
              const meaningfulWords = beforeWords
                .slice(-2)
                .filter((w: string) => !['the', 'a', 'an', 'for', 'your', 'is', 'are'].includes(w.toLowerCase()));
              
              if (meaningfulWords.length > 0) {
                label = meaningfulWords.join(' ');
              } else if (beforeWords.length > 0) {
                label = beforeWords.slice(-2).join(' ');
              }
            }
          }
          
          // Capitalize first letter of each word
          label = label.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
          
          parameters.push({
            type: 'text',
            example: exampleValue || '',
            text: label,
          });
        });
      }
    }
    
    // HEADER with media format (IMAGE, VIDEO, DOCUMENT)
    if ((format === 'IMAGE' || format === 'VIDEO' || format === 'DOCUMENT') && example.header_handle) {
      let headerHandles: string[] = [];
      
      if (Array.isArray(example.header_handle)) {
        if (example.header_handle.length > 0) {
          if (Array.isArray(example.header_handle[0])) {
            headerHandles = example.header_handle[0] as string[];
          } else {
            headerHandles = example.header_handle as string[];
          }
        }
      }
      
      if (headerHandles.length > 0) {
        headerHandles.forEach((exampleValue: string, index: number) => {
          const paramType = format === 'IMAGE' ? 'image' : format === 'VIDEO' ? 'video' : 'document';
          // For media headers, use a more descriptive label based on format
          let label = format === 'IMAGE' ? 'Image' : format === 'VIDEO' ? 'Video' : 'Document';
          if (headerHandles.length > 1) {
            label = `${label} ${index + 1}`;
          }
          
          parameters.push({
            type: paramType,
            example: exampleValue || '',
            text: label,
            // HEADER media parameters typically don't use named parameters
          });
        });
      }
    }
  }

  // Handle FOOTER component variables (if any - though typically footer doesn't have variables)
  if (componentType === 'FOOTER' && Array.isArray(example.footer_text) && example.footer_text.length > 0) {
    example.footer_text.forEach((exampleValue: string, index: number) => {
      parameters.push({
        type: 'text',
        example: exampleValue || '',
        text: `Footer Variable ${index + 1}`,
      });
    });
  }

  return parameters;
}

/**
 * Transform WhatsApp API template response to include parameters array
 */
export function transformTemplate(template: any): any {
  // Create a copy of the template
  const transformed = { ...template };

  // Process components to add parameters array
  if (Array.isArray(template.components)) {
    transformed.components = template.components.map((component: any) => {
      const transformedComponent = { ...component };
      transformedComponent.parameters = parseComponentParameters(component);
      return transformedComponent;
    });
  } else {
    transformed.components = [];
  }

  return transformed;
}

export async function POST(req: NextRequest) {
  // Require authentication
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { wabaId } = await req.json();
  console.log('Received wabaId:', wabaId);
  console.log('Access token present:', !!ACCESS_TOKEN);
  if (!wabaId || !ACCESS_TOKEN) {
    return NextResponse.json({ error: 'WhatsApp API credentials (WABA_ID or ACCESS_TOKEN) not set' }, { status: 500 });
  }
  try {
    // Request templates with components and example fields
    // The example field contains variable information
    const response = await fetch(`${WHATSAPP_API_URL}/${wabaId}/message_templates?fields=name,language,status,category,components{type,format,text,example}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    if (!response.ok) {
      console.log('WhatsApp API error:', data);
      return NextResponse.json({ error: data }, { status: response.status });
    }
    
    // Log the complete raw response from WhatsApp API
    console.log('='.repeat(80));
    console.log('📋 RAW WHATSAPP API TEMPLATE RESPONSE:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(data, null, 2));
    console.log('='.repeat(80));
    
    // Debug: Log detailed structure for each template
    if (data.data && data.data.length > 0) {
      console.log(`\n📦 Found ${data.data.length} templates. Detailed structure:\n`);
      data.data.forEach((template: any, index: number) => {
        console.log(`\n--- Template ${index + 1}: ${template.name} (${template.language}) ---`);
        console.log('Full template object:', JSON.stringify(template, null, 2));
        
        if (template.components && Array.isArray(template.components)) {
          template.components.forEach((comp: any, compIndex: number) => {
            console.log(`\n  Component ${compIndex + 1}: ${comp.type}${comp.format ? ` (${comp.format})` : ''}`);
            console.log(`  Text: ${comp.text || '(no text)'}`);
            console.log(`  Example field:`, JSON.stringify(comp.example, null, 4));
            if (comp.example) {
              console.log(`  Example keys:`, Object.keys(comp.example));
              if (comp.example.body_text) {
                console.log(`  body_text:`, comp.example.body_text);
              }
              if (comp.example.body_text_named_params) {
                console.log(`  body_text_named_params:`, comp.example.body_text_named_params);
              }
              if (comp.example.header_text) {
                console.log(`  header_text:`, comp.example.header_text);
              }
              if (comp.example.header_handle) {
                console.log(`  header_handle:`, comp.example.header_handle);
              }
            }
          });
        }
      });
    }
    
    // Transform templates to include parameters array
    const whatsappTemplates = (data.data || []).map(transformTemplate);
    
    // Sync templates with database (upsert based on name + language)
    for (const template of whatsappTemplates) {
      try {
        // Find existing template by name and language
        const existing = await prisma.template.findFirst({
          where: {
            name: template.name,
            language: template.language,
          },
        });

        if (existing) {
          // Update existing template (preserve permissions)
          await prisma.template.update({
            where: { id: existing.id },
            data: {
              status: template.status,
              category: template.category,
              components: template.components as any,
              whatsappTemplateId: template.id,
            },
          });
        } else {
          // Create new template with default empty permissions
          await prisma.template.create({
            data: {
              name: template.name,
              language: template.language,
              category: template.category,
              status: template.status,
              components: template.components as any,
              whatsappTemplateId: template.id,
              allowedUserIds: [],
              allowedClientIds: [],
            },
          });
        }
      } catch (error) {
        console.warn('Failed to sync template to database:', error);
      }
    }
    
    // Get templates from database filtered by user permissions
    const userTemplates = await templateDB.getTemplatesForUser(
      session.user.id,
      session.user.role
    );
    
    // Debug logging
    console.log('🔐 Template permission check:', {
      userId: session.user.id,
      userRole: session.user.role,
      userEmail: session.user.email,
      totalWhatsAppTemplates: whatsappTemplates.length,
      allowedTemplatesCount: userTemplates.length,
      allowedTemplateNames: userTemplates.map((t: any) => `${t.name} (${t.language})`)
    });
    
    // Map database templates to WhatsApp template format for response
    // Match by name and language, and include WhatsApp template data
    const filteredTemplates = whatsappTemplates.filter((wt: any) => {
      return userTemplates.some(
        (dt: any) => dt.name === wt.name && dt.language === wt.language
      );
    });
    
    console.log('📋 Returning filtered templates:', {
      filteredCount: filteredTemplates.length,
      filteredNames: filteredTemplates.map((t: any) => `${t.name} (${t.language})`)
    });
    
    return NextResponse.json({ templates: filteredTemplates });
  } catch (error) {
    console.log('Catch error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

// Optional: keep GET for backward compatibility
export async function GET() {
  // Require authentication
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  return NextResponse.json({ error: 'Use POST with wabaId' }, { status: 400 });
} 