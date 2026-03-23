import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { businessNumberDB } from '@/app/lib/database';

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get active business numbers
    const numbers = await businessNumberDB.getActive();
    
    return NextResponse.json(numbers);
  } catch (error) {
    console.error('❌ Error fetching numbers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch numbers' },
      { status: 500 }
    );
  }
}
