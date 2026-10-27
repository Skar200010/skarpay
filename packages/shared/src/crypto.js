import crypto from 'node:crypto';

export function generateHmac(data, secret) {
  return crypto.createHmac('sha256', secret).update(data, 'utf8').digest('hex');
}

export function verifyHmac(data, secret, expectedSignature) {
  const actualSignature = generateHmac(data, secret);
  const actualBuffer = Buffer.from(actualSignature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

export function generateRandomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

export function sha256(input) {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}
