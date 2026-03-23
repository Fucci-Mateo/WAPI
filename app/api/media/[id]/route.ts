import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: any) {
  try {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json({ error: 'WHATSAPP_ACCESS_TOKEN not configured' }, { status: 500 });
    }

    const mediaId = context?.params?.id as string | undefined;
    if (!mediaId) {
      return NextResponse.json({ error: 'Missing media id' }, { status: 400 });
    }

    // Step 1: Get media metadata (includes a URL and mime_type)
    const metaRes = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(mediaId)}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    });

    if (!metaRes.ok) {
      const text = await metaRes.text();
      let errorDetails = text;
      
      // Try to parse error response for better error messages
      try {
        const errorJson = JSON.parse(text);
        if (errorJson.error) {
          errorDetails = errorJson.error.message || errorJson.error.type || text;
        }
      } catch {
        // If parsing fails, use original text
      }
      
      // Log error for debugging but don't expose internal details to client
      console.error(`[Media API] Failed to fetch media metadata for ${mediaId}:`, {
        status: metaRes.status,
        error: errorDetails,
      });
      
      // Return appropriate status code
      if (metaRes.status === 404) {
        return NextResponse.json({ error: 'Media not found or expired' }, { status: 404 });
      } else if (metaRes.status === 400) {
        return NextResponse.json({ error: 'Invalid media ID' }, { status: 400 });
      } else {
        return NextResponse.json({ error: 'Failed to fetch media metadata' }, { status: metaRes.status });
      }
    }

    const meta = await metaRes.json();
    const mediaUrl: string | undefined = meta.url;
    const mimeType: string | undefined = meta.mime_type || meta['mime-type'];

    if (!mediaUrl) {
      console.error(`[Media API] Media URL not found in metadata for ${mediaId}:`, meta);
      return NextResponse.json({ error: 'Media URL not found in metadata' }, { status: 502 });
    }

    // Step 2: Download the media
    const mediaRes = await fetch(mediaUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    });

    if (!mediaRes.ok) {
      const text = await mediaRes.text();
      console.error(`[Media API] Failed to download media for ${mediaId}:`, {
        status: mediaRes.status,
        error: text,
      });
      
      if (mediaRes.status === 404) {
        return NextResponse.json({ error: 'Media file not found or expired' }, { status: 404 });
      } else {
        return NextResponse.json({ error: 'Failed to download media' }, { status: mediaRes.status });
      }
    }

    const arrayBuffer = await mediaRes.arrayBuffer();
    const contentType = mimeType || mediaRes.headers.get('content-type') || 'application/octet-stream';

    return new NextResponse(Buffer.from(arrayBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (error) {
    console.error('[Media API] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Media proxy error', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}


