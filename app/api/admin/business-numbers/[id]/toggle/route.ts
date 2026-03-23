import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { businessNumberDB } from '@/app/lib/database';

// PATCH - Toggle business number active status
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
    const number = await businessNumberDB.toggleActive(id);
    
    return NextResponse.json(number);
  } catch (error) {
    console.error('❌ Error toggling business number:', error);
    return NextResponse.json(
      { error: 'Failed to toggle business number' },
      { status: 500 }
    );
  }
}
