import { NextRequest } from 'next/server';
import { prisma } from './database';
import bcrypt from 'bcryptjs';

export interface ResolvedClient {
  id: string;
  name: string;
  defaultNumberId: string | null;
  rateLimitPerMin: number;
  scopes: string[];
}

// Define available scopes
export const SCOPES = {
  MESSAGES_SEND: 'messages:send',
  MESSAGES_READ: 'messages:read',
  TEMPLATES_READ: 'templates:read',
} as const;

export type Scope = typeof SCOPES[keyof typeof SCOPES];

export async function authenticateClient(req: NextRequest): Promise<ResolvedClient | null> {
  const apiKey = req.headers.get('x-api-key') || '';
  if (!apiKey) return null;

  // Fetch all active API keys with their clients
  const keys = await prisma.apiKey.findMany({
    where: { isActive: true, client: { isActive: true } },
    include: { client: true },
  });

  // Try to match the API key using bcrypt comparison
  // Support both hashed keys (new) and plaintext keys (legacy migration)
  for (const k of keys) {
    let isMatch = false;
    
    // Check if stored keyHash is a bcrypt hash (starts with $2a$, $2b$, or $2y$)
    if (k.keyHash.startsWith('$2')) {
      // It's a bcrypt hash, use bcrypt.compare
      isMatch = await bcrypt.compare(apiKey, k.keyHash);
    } else {
      // Legacy plaintext comparison (for migration period)
      isMatch = k.keyHash === apiKey;
    }

    if (isMatch) {
      // Update lastUsedAt
      await prisma.apiKey.update({
        where: { id: k.id },
        data: { lastUsedAt: new Date() },
      }).catch(() => {}); // Don't fail auth if update fails

      return {
        id: k.clientId,
        name: k.client.name,
        defaultNumberId: k.client.defaultNumberId,
        rateLimitPerMin: k.client.rateLimitPerMin,
        scopes: k.scopes,
      };
    }
  }
  return null;
}

export function hasScope(client: ResolvedClient, requiredScope: Scope): boolean {
  return client.scopes.includes(requiredScope);
}

export function pickHeadersForLog(req: NextRequest) {
  const entries: Record<string, string> = {};
  const keep = ['x-api-key', 'x-number-id', 'idempotency-key', 'user-agent'];
  for (const name of keep) {
    const v = req.headers.get(name);
    if (v) entries[name] = name === 'x-api-key' ? '***' : v;
  }
  return entries;
}


