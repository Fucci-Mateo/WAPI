import { NextRequest, NextResponse } from 'next/server';
import { authenticateClient, hasScope, SCOPES } from '@/app/lib/extAuth';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v19.0';
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

// File size limits in bytes
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_AUDIO_SIZE = 16 * 1024 * 1024; // 16 MB
const MAX_DOCUMENT_SIZE = 100 * 1024 * 1024; // 100 MB

// Supported MIME types
const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const AUDIO_TYPES = ['audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg'];
const DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

function getMediaType(mimeType: string): 'image' | 'audio' | 'document' | null {
  if (IMAGE_TYPES.includes(mimeType)) return 'image';
  if (AUDIO_TYPES.includes(mimeType)) return 'audio';
  if (DOCUMENT_TYPES.includes(mimeType)) return 'document';
  return null;
}

function getMaxSize(mediaType: 'image' | 'audio' | 'document'): number {
  switch (mediaType) {
    case 'image': return MAX_IMAGE_SIZE;
    case 'audio': return MAX_AUDIO_SIZE;
    case 'document': return MAX_DOCUMENT_SIZE;
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!ACCESS_TOKEN) {
      return NextResponse.json({ error: 'Server not configured for WhatsApp API' }, { status: 500 });
    }

    // Authenticate client
    const client = await authenticateClient(req);
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check required scope
    if (!hasScope(client, SCOPES.MESSAGES_SEND)) {
      return NextResponse.json({ error: 'Forbidden - missing required scope: messages:send' }, { status: 403 });
    }

    // Get numberId from header, query param, or client default
    const numberId = req.headers.get('x-number-id') || new URL(req.url).searchParams.get('numberId') || client.defaultNumberId || null;
    if (!numberId) {
      return NextResponse.json({ error: 'numberId is required (header X-Number-Id or client default)' }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const mimeType = file.type;
    const mediaType = getMediaType(mimeType);

    if (!mediaType) {
      return NextResponse.json({ 
        error: 'Unsupported file type', 
        details: `Supported types: images (${IMAGE_TYPES.join(', ')}), audio (${AUDIO_TYPES.join(', ')}), documents (${DOCUMENT_TYPES.join(', ')})` 
      }, { status: 400 });
    }

    const fileSize = file.size;
    const maxSize = getMaxSize(mediaType);

    if (fileSize > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      return NextResponse.json({ 
        error: 'File too large', 
        details: `Maximum size for ${mediaType} is ${maxSizeMB}MB` 
      }, { status: 400 });
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine the type parameter for WhatsApp API
    const typeParam = mediaType === 'document' ? 'document' : mediaType;

    // Create multipart/form-data manually for WhatsApp API upload
    const boundary = `----WebKitFormBoundary${Date.now()}${Math.random().toString(36).substring(2)}`;
    const CRLF = '\r\n';
    const parts: Buffer[] = [];
    
    // Add messaging_product field
    parts.push(Buffer.from(`--${boundary}${CRLF}`));
    parts.push(Buffer.from(`Content-Disposition: form-data; name="messaging_product"${CRLF}${CRLF}`));
    parts.push(Buffer.from(`whatsapp${CRLF}`));
    
    // Add type field
    parts.push(Buffer.from(`--${boundary}${CRLF}`));
    parts.push(Buffer.from(`Content-Disposition: form-data; name="type"${CRLF}${CRLF}`));
    parts.push(Buffer.from(`${typeParam}${CRLF}`));
    
    // Add file field
    parts.push(Buffer.from(`--${boundary}${CRLF}`));
    parts.push(Buffer.from(`Content-Disposition: form-data; name="file"; filename="${file.name}"${CRLF}`));
    parts.push(Buffer.from(`Content-Type: ${mimeType}${CRLF}${CRLF}`));
    parts.push(buffer);
    parts.push(Buffer.from(`${CRLF}--${boundary}--${CRLF}`));
    
    const formDataBuffer = Buffer.concat(parts);

    const uploadResponse = await fetch(`${WHATSAPP_API_URL}/${numberId}/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: formDataBuffer,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('WhatsApp media upload error:', errorText);
      return NextResponse.json({ 
        error: 'Failed to upload media to WhatsApp', 
        details: errorText 
      }, { status: uploadResponse.status });
    }

    const uploadData = await uploadResponse.json();
    const mediaId = uploadData.id;

    if (!mediaId) {
      return NextResponse.json({ 
        error: 'No media ID returned from WhatsApp' 
      }, { status: 500 });
    }

    return NextResponse.json({
      mediaId,
      mediaType,
      mimeType,
      fileName: file.name,
      fileSize,
    });
  } catch (error) {
    console.error('Media upload error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

