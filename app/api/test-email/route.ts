import { NextRequest, NextResponse } from 'next/server';
import { sendTestEmail } from '@/app/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const success = await sendTestEmail(email);
    
    if (success) {
      return NextResponse.json({
        message: 'Test email sent successfully',
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send test email' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json(
      { error: 'An error occurred while sending test email' },
      { status: 500 }
    );
  }
}
