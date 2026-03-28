import { NextRequest, NextResponse } from 'next/server';
import { CustomerServiceWindowDatabaseService, BusinessNumberDatabaseService } from '@/app/lib/database';
import { normalizeWhatsAppIdentity } from '@/app/lib/whatsappIdentity';

const customerServiceWindowService = new CustomerServiceWindowDatabaseService();
const businessNumberService = new BusinessNumberDatabaseService();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get('phone');
  const numberId = searchParams.get('numberId') || searchParams.get('businessNumberId');

  if (!phone) {
    return NextResponse.json({ error: 'Missing phone parameter' }, { status: 400 });
  }

  const businessNumber = numberId ? await businessNumberService.getByNumberId(numberId) : null;
  const scopeId = businessNumber?.wabaId || 'legacy';

  // Normalize the phone/identity before querying
  const normalizedPhone = normalizeWhatsAppIdentity(phone);
  const status = await customerServiceWindowService.getWindowStatus(scopeId, normalizedPhone);
  return NextResponse.json(status);
}
