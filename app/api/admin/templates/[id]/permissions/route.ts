import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { templateDB } from '@/app/lib/database';

// PUT - Update template permissions
export async function PUT(
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
    const { allowedUserIds, allowedClientIds } = body;

    // Validate input
    if (!Array.isArray(allowedUserIds) || !Array.isArray(allowedClientIds)) {
      return NextResponse.json(
        { error: 'allowedUserIds and allowedClientIds must be arrays' },
        { status: 400 }
      );
    }

    // Update permissions
    const template = await templateDB.updatePermissions(
      id,
      allowedUserIds,
      allowedClientIds
    );

    return NextResponse.json(template);
  } catch (error) {
    console.error('❌ Error updating template permissions:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update template permissions' },
      { status: 500 }
    );
  }
}
