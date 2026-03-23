import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/database';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// GET - List all API keys for a client
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

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const keys = await prisma.apiKey.findMany({
      where: { clientId: id },
      select: {
        id: true,
        isActive: true,
        scopes: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ keys });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

// POST - Generate a new API key for a client
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { scopes } = await req.json();

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Generate a secure random API key
    // Format: wak_<32 random hex chars>
    const randomBytes = crypto.randomBytes(16);
    const apiKey = `wak_${randomBytes.toString('hex')}`;

    // Hash the API key before storing
    const keyHash = await bcrypt.hash(apiKey, 12);

    // Store the hashed key
    const apiKeyRecord = await prisma.apiKey.create({
      data: {
        clientId: id,
        keyHash,
        scopes: scopes || [],
        isActive: true,
      },
      select: {
        id: true,
        isActive: true,
        scopes: true,
        createdAt: true,
      },
    });

    // Return the plaintext key only once (never stored)
    return NextResponse.json({
      apiKey,
      key: apiKeyRecord,
      message: 'API key generated. Store it securely - it will not be shown again.',
    }, { status: 201 });
  } catch (error) {
    console.error('Error generating API key:', error);
    return NextResponse.json(
      { error: 'Failed to generate API key' },
      { status: 500 }
    );
  }
}


