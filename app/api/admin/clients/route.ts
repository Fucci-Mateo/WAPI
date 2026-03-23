import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/database';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// GET - List all clients
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const clients = await prisma.client.findMany({
      include: {
        apiKeys: {
          select: {
            id: true,
            isActive: true,
            scopes: true,
            createdAt: true,
            lastUsedAt: true,
          },
        },
        _count: {
          select: {
            requestLogs: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ clients });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

// POST - Create a new client
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, defaultNumberId, rateLimitPerMin } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Check if client with this name already exists
    const existing = await prisma.client.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Client with this name already exists' },
        { status: 400 }
      );
    }

    const client = await prisma.client.create({
      data: {
        name,
        defaultNumberId: defaultNumberId || null,
        rateLimitPerMin: rateLimitPerMin || 60,
        isActive: true,
      },
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    );
  }
}


