export interface WhatsAppIdentitySource {
  phoneNumber?: string | null;
  businessScopedUserId?: string | null;
  whatsappId?: string | null;
}

const WHATSAPP_PREFIX_RE = /^whatsapp:/i;

function stripWhatsAppPrefix(value: string): string {
  return value.replace(WHATSAPP_PREFIX_RE, '');
}

export function normalizeWhatsAppIdentity(value: string | null | undefined): string {
  if (!value) return '';

  const trimmed = stripWhatsAppPrefix(String(value).trim()).replace(/%20/g, '').trim();
  if (!trimmed) return '';

  const phoneCandidate = trimmed.startsWith('+') ? trimmed.slice(1) : trimmed;
  const compactPhoneCandidate = phoneCandidate.replace(/[\s().-]/g, '');

  // Preserve business-scoped IDs and other opaque identifiers.
  // Phone numbers remain normalized to digits only so legacy lookups keep working.
  if (/^\d{8,15}$/.test(compactPhoneCandidate)) {
    return compactPhoneCandidate;
  }

  return trimmed;
}

export function normalizePhoneNumber(value: string | null | undefined): string {
  return normalizeWhatsAppIdentity(value);
}

export function isLikelyPhoneIdentity(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = normalizeWhatsAppIdentity(value);
  const digitsOnly = normalized.startsWith('+') ? normalized.slice(1) : normalized;
  return /^\d{8,15}$/.test(digitsOnly.replace(/[\s().-]/g, ''));
}

export function isLikelyBusinessScopedUserId(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = normalizeWhatsAppIdentity(value);
  return normalized.length > 0 && !isLikelyPhoneIdentity(normalized);
}

export function getContactIdentityAliases(source: WhatsAppIdentitySource): string[] {
  const aliases = [
    normalizeWhatsAppIdentity(source.phoneNumber),
    normalizeWhatsAppIdentity(source.businessScopedUserId),
    normalizeWhatsAppIdentity(source.whatsappId),
  ].filter(Boolean);

  return Array.from(new Set(aliases));
}

export function getCanonicalContactIdentity(
  source: WhatsAppIdentitySource,
  preferPhone = true
): string {
  const phone = normalizeWhatsAppIdentity(source.phoneNumber);
  const bsuid = normalizeWhatsAppIdentity(source.businessScopedUserId);
  const whatsappId = normalizeWhatsAppIdentity(source.whatsappId);

  if (preferPhone) {
    return phone || bsuid || whatsappId || '';
  }

  return bsuid || phone || whatsappId || '';
}

export function sameWhatsAppIdentity(a: string | null | undefined, b: string | null | undefined): boolean {
  return normalizeWhatsAppIdentity(a) === normalizeWhatsAppIdentity(b);
}
