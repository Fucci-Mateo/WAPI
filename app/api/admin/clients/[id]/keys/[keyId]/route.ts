import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/database';

// PATCH - Update an API key (toggle active, update scopes)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; keyId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, keyId } = await params;
    const { isActive, scopes } = await req.json();

    // Verify the key belongs to the client
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: keyId,
        clientId: id,
      },
    });

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (scopes !== undefined) updateData.scopes = scopes;

    const updated = await prisma.apiKey.update({
      where: { id: keyId },
      data: updateData,
      select: {
        id: true,
        isActive: true,
        scopes: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });

    return NextResponse.json({ key: updated });
  } catch (error) {
    console.error('Error updating API key:', error);
    return NextResponse.json(
      { error: 'Failed to update API key' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an API key
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; keyId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, keyId } = await params;

    // Verify the key belongs to the client
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: keyId,
        clientId: id,
      },
    });

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    await prisma.apiKey.delete({
      where: { id: keyId },
    });

    return NextResponse.json({ message: 'API key deleted successfully' });
  } catch (error) {
    console.error('Error deleting API key:', error);
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}


