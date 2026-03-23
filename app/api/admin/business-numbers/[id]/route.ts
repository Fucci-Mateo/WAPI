import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { businessNumberDB } from '@/app/lib/database';
import { businessNumberUpdateSchema } from '@/app/lib/validation';

// PATCH - Update business number
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const validatedData = businessNumberUpdateSchema.parse(body);

    const number = await businessNumberDB.update(id, validatedData);
    return NextResponse.json(number);
  } catch (error) {
    console.error('❌ Error updating business number:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update business number' },
      { status: 500 }
    );
  }
}

// DELETE - Delete business number
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    await businessNumberDB.delete(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting business number:', error);
    return NextResponse.json(
      { error: 'Failed to delete business number' },
      { status: 500 }
    );
  }
}
