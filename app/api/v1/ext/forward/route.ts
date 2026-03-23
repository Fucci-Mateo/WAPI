import { NextRequest, NextResponse } from 'next/server';
import { authenticateClient, pickHeadersForLog, hasScope, SCOPES } from '@/app/lib/extAuth';
import { prisma } from '@/app/lib/database';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v19.0';
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let clientId: string | null = null;
  let numberId: string | null = null;
  let responseCode = 500;
  let status = 'ERROR';
  let responseBody: any = null;
  let error: string | undefined;

  try {
    if (!ACCESS_TOKEN) {
      return NextResponse.json({ error: 'Server not configured for WhatsApp API' }, { status: 500 });
    }

    const client = await authenticateClient(req);
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    clientId = client.id;

    // Check required scope
    if (!hasScope(client, SCOPES.MESSAGES_SEND)) {
      return NextResponse.json({ error: 'Forbidden - missing required scope: messages:send' }, { status: 403 });
    }

    // Determine numberId
    numberId = req.headers.get('x-number-id') || new URL(req.url).searchParams.get('numberId') || client.defaultNumberId || null;
    if (!numberId) {
      return NextResponse.json({ error: 'numberId is required (header X-Number-Id or client default)' }, { status: 400 });
    }

    // Parse raw JSON payload and minimally validate
    const body = await req.json();
    if (!body || body.messaging_product !== 'whatsapp' || !body.type || !body.to) {
      return NextResponse.json({ error: 'Invalid payload: require messaging_product, to, type' }, { status: 400 });
    }

    // Idempotency (best-effort v1)
    const idemKey = req.headers.get('idempotency-key');
    if (idemKey) {
      const existing = await prisma.idempotencyKey.findUnique({
        where: { clientId_key: { clientId: client.id, key: idemKey } },
      });
      if (existing) {
        return NextResponse.json({ status: 'DUPLICATE', idempotencyKey: idemKey, messageId: existing.messageId }, { status: 200 });
      }
    }

    const upstream = await fetch(`${WHATSAPP_API_URL}/${numberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    responseCode = upstream.status;
    responseBody = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      status = 'UPSTREAM_ERROR';
      return NextResponse.json({ error: 'upstream_error', upstream: responseBody }, { status: upstream.status });
    }

    status = 'OK';

    // Persist messageId if present for idempotency and association
    const messageId = responseBody?.messages?.[0]?.id as string | undefined;
    if (messageId && idemKey) {
      await prisma.idempotencyKey.create({ data: { clientId: client.id, key: idemKey, messageId } });
    }

    return NextResponse.json(responseBody);
  } catch (e: any) {
    error = e?.message || String(e);
    responseBody = { error };
    responseCode = 500;
    status = 'ERROR';
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  } finally {
    try {
      // Persist audit log
      await prisma.extRequestLog.create({
        data: {
          clientId: clientId || 'unknown',
          method: 'POST',
          path: '/api/v1/ext/forward',
          numberId: numberId || undefined,
          status,
          responseCode,
          durationMs: Date.now() - startedAt,
          ip: req.headers.get('x-forwarded-for') || undefined,
          userAgent: req.headers.get('user-agent') || undefined,
          requestedAt: new Date(startedAt),
          respondedAt: new Date(),
          requestHeadersSubset: pickHeadersForLog(req),
          // Avoid double-reading body: we cannot re-read here in Next.js request stream
          requestBody: undefined,
          responseBody: responseBody ?? undefined,
          error,
        },
      });
    } catch {}
  }
}


