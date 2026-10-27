import crypto from 'node:crypto';
import { generateHmac } from '../../../../packages/shared/src/crypto.js';

export async function deliverWebhook({ url, secret, payload }) {
  const raw = JSON.stringify(payload);
  const signature = 'sha256=' + generateHmac(raw, secret);
  const deliveryId = crypto.randomUUID();
  const timestamp = Date.now();

  const headers = {
    'Content-Type': 'application/json',
    'X-Gateway-Event': payload.event,
    'X-Gateway-Signature': signature,
    'X-Gateway-Delivery-Id': deliveryId,
    'X-Gateway-Timestamp': String(timestamp),
  };

  const res = await fetch(url, { method: 'POST', headers, body: raw });
  if (!res.ok) throw new Error(`Webhook delivery failed: ${res.status}`);
  return { deliveryId, status: res.status };
}
