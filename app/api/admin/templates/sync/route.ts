import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/database';
import { transformTemplate } from '../../../templates/route';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v19.0';
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

// POST - Sync templates from WhatsApp for all business numbers (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'WhatsApp API access token not set' },
        { status: 500 }
      );
    }

    const businessNumbers = await prisma.businessNumber.findMany({
      where: {
        wabaId: { not: "" },
        isActive: true,
      },
      select: {
        wabaId: true,
        label: true,
      },
    });

    const uniqueWabaIds = Array.from(
      new Set(
        businessNumbers
          .map((bn) => bn.wabaId)
          .filter((id): id is string => !!id)
      )
    );

    if (uniqueWabaIds.length === 0) {
      return NextResponse.json({
        status: 'ok',
        message: 'No active business numbers with WABA IDs configured',
        syncedWabaCount: 0,
        templatesProcessed: 0,
      });
    }

    let totalTemplatesProcessed = 0;

    for (const wabaId of uniqueWabaIds) {
      try {
        const response = await fetch(
          `${WHATSAPP_API_URL}/${wabaId}/message_templates?fields=name,language,status,category,components{type,format,text,example}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          console.error(
            `❌ Failed to fetch templates for WABA ${wabaId}:`,
            data
          );
          continue;
        }

        const whatsappTemplates = (data.data || []).map(transformTemplate);
        totalTemplatesProcessed += whatsappTemplates.length;

        // Sync templates with database (upsert based on name + language)
        for (const template of whatsappTemplates) {
          try {
            const existing = await prisma.template.findFirst({
              where: {
                name: template.name,
                language: template.language,
              },
            });

            if (existing) {
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
              await prisma.template.create({
                data: {
                  name: template.name,
                  language: template.language,
                  category: template.category,
                  status: template.status,
                  components: template.components as any,
                  whatsappTemplateId: template.id,
                  // By default, permissions arrays are empty which we now treat as RESTRICTED.
                  allowedUserIds: [],
                  allowedClientIds: [],
                },
              });
            }
          } catch (error) {
            console.warn(
              `⚠️ Failed to sync template "${template.name}" (${template.language}) to database:`,
              error
            );
          }
        }
      } catch (error) {
        console.error(
          `❌ Error syncing templates for WABA ${wabaId}:`,
          error
        );
      }
    }

    return NextResponse.json({
      status: 'ok',
      syncedWabaCount: uniqueWabaIds.length,
      templatesProcessed: totalTemplatesProcessed,
    });
  } catch (error) {
    console.error('❌ Error syncing templates:', error);
    return NextResponse.json(
      { error: 'Failed to sync templates' },
      { status: 500 }
    );
  }
}

