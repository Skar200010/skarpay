import QRCode from 'qrcode';
import { buildUpiUri } from '../../../../packages/shared/src/upi.js';

export async function generateQrSvg(options) {
  const upiUri = buildUpiUri(options);
  const svg = await QRCode.toString(upiUri, { type: 'svg', margin: 1, width: 256 });
  return { upiUri, svg };
}
