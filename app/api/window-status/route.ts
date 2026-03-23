import { NextRequest, NextResponse } from 'next/server';
import { CustomerServiceWindowDatabaseService } from '@/app/lib/database';

const customerServiceWindowService = new CustomerServiceWindowDatabaseService();

// Normalize phone number format (remove + prefix, spaces, and URL encoding for consistency)
const normalizePhoneNumber = (phone: string): string => {
  if (!phone) return '';
  // Remove + prefix
  let normalized = phone.startsWith('+') ? phone.substring(1) : phone;
  // Remove all spaces and URL encoding
  normalized = normalized.replace(/\s+/g, '').replace(/%20/g, '');
  return normalized;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get('phone');

  if (!phone) {
    return NextResponse.json({ error: 'Missing phone parameter' }, { status: 400 });
  }

  // Normalize the phone number before querying
  const normalizedPhone = normalizePhoneNumber(phone);
  const status = await customerServiceWindowService.getWindowStatus(normalizedPhone);
  return NextResponse.json(status);
} 