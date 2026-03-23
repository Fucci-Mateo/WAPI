import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/database';

// GET - Get request logs for a client
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Build where clause
    const where: any = { clientId: id };
    if (startDate || endDate) {
      where.requestedAt = {};
      if (startDate) {
        where.requestedAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.requestedAt.lte = new Date(endDate);
      }
    }

    // Get logs with pagination
    const [logs, total] = await Promise.all([
      prisma.extRequestLog.findMany({
        where,
        orderBy: {
          requestedAt: 'desc',
        },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.extRequestLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching request logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch request logs' },
      { status: 500 }
    );
  }
}


