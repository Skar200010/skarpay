import crypto from 'node:crypto';

const TOKEN_TTL_MS = 10 * 60 * 1000;

function enrollmentSecret() {
  const secret = process.env.ADMIN_API_KEY || process.env.ENROLLMENT_SECRET;
  if (!secret) throw new Error('ADMIN_API_KEY is required to sign enrollment tokens');
  return secret;
}

function sign(body) {
  return crypto.createHmac('sha256', enrollmentSecret()).update(body).digest('base64url');
}

export function createEnrollmentToken(merchantId) {
  if (!merchantId) throw new Error('merchantId is required');
  const body = Buffer.from(
    JSON.stringify({ merchantId, exp: Date.now() + TOKEN_TTL_MS }),
    'utf8',
  ).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function verifyEnrollmentToken(token) {
  if (typeof token !== 'string') return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;

  const expected = sign(body);
  const actualBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(actualBuf, expectedBuf)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload?.merchantId || !payload?.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export const ENROLLMENT_TOKEN_TTL_MS = TOKEN_TTL_MS;
