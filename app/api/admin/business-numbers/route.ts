import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { businessNumberDB } from '@/app/lib/database';
import { businessNumberCreateSchema } from '@/app/lib/validation';

// GET - List all business numbers
export async function GET(req: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const numbers = await businessNumberDB.getAll();
    return NextResponse.json(numbers);
  } catch (error) {
    console.error('❌ Error fetching business numbers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch business numbers' },
      { status: 500 }
    );
  }
}

// POST - Create new business number
export async function POST(req: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = businessNumberCreateSchema.parse(body);

    const number = await businessNumberDB.create(validatedData);
    return NextResponse.json(number, { status: 201 });
  } catch (error) {
    console.error('❌ Error creating business number:', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create business number' },
      { status: 500 }
    );
  }
}
