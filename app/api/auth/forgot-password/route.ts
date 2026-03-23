import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/database';
import { sendPasswordResetEmail } from '@/app/lib/email';
import { z } from 'zod';
import crypto from 'crypto';

// Validation schema for forgot password request
const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
      },
    });

    // Always return success to prevent email enumeration attacks
    // But only send email if user exists and is active
    if (!user || !user.isActive) {
      return NextResponse.json({
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Delete any existing reset tokens for this user
    await prisma.resetToken.deleteMany({
      where: { userId: user.id },
    });

    // Create new reset token
    await prisma.resetToken.create({
      data: {
        token: resetToken,
        userId: user.id,
        expires,
      },
    });

    // Send password reset email
    const emailSent = await sendPasswordResetEmail({
      to: user.email,
      resetToken,
      userName: user.name || 'User',
    });

    if (!emailSent) {
      console.error('❌ Failed to send password reset email to:', user.email);
      // Still return success to prevent information leakage
    }

    return NextResponse.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('❌ Error in forgot password request:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
