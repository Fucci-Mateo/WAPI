import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/database';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// Validation schema for reset password
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = resetPasswordSchema.parse(body);

    // Find the reset token
    const resetToken = await prisma.resetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    // Check if token exists and is valid
    if (!resetToken) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (resetToken.expires < new Date()) {
      // Clean up expired token
      await prisma.resetToken.delete({
        where: { id: resetToken.id },
      });
      
      return NextResponse.json(
        { error: 'Reset token has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check if token has already been used
    if (resetToken.used) {
      return NextResponse.json(
        { error: 'Reset token has already been used. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check if user is still active
    if (!resetToken.user.isActive) {
      return NextResponse.json(
        { error: 'Account is not active. Please contact an administrator.' },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user password and mark token as used
    await prisma.$transaction(async (tx) => {
      // Update user password
      await tx.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      });

      // Mark token as used
      await tx.resetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      });

      // Delete all other reset tokens for this user
      await tx.resetToken.deleteMany({
        where: {
          userId: resetToken.userId,
          id: { not: resetToken.id },
        },
      });
    });

    console.log('✅ Password reset successfully for user:', resetToken.user.email);

    return NextResponse.json({
      message: 'Password has been reset successfully. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('❌ Error in reset password:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}

// GET - Verify reset token validity
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Reset token is required' },
        { status: 400 }
      );
    }

    // Find the reset token
    const resetToken = await prisma.resetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    // Check if token exists and is valid
    if (!resetToken) {
      return NextResponse.json(
        { error: 'Invalid reset token' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (resetToken.expires < new Date()) {
      return NextResponse.json(
        { error: 'Reset token has expired' },
        { status: 400 }
      );
    }

    // Check if token has already been used
    if (resetToken.used) {
      return NextResponse.json(
        { error: 'Reset token has already been used' },
        { status: 400 }
      );
    }

    // Check if user is still active
    if (!resetToken.user.isActive) {
      return NextResponse.json(
        { error: 'Account is not active' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      email: resetToken.user.email,
      name: resetToken.user.name,
    });
  } catch (error) {
    console.error('❌ Error verifying reset token:', error);
    return NextResponse.json(
      { error: 'An error occurred while verifying the token' },
      { status: 500 }
    );
  }
}
