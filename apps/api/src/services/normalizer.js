// Observation normalizer: extract amount/UTR/VPA from raw bank SMS/email text.
// Ported concept from YOUPI PG ObservationNormalizer.

const AMOUNT_REGEXES = [
  /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
  /credited with (?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  /received (?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
];

const UTR_REGEXES = [
  /\b(\d{12})\b/,
  /UTR[:\s]*([A-Za-z0-9]{6,22})/i,
  /Ref(?:erence)?(?:\s*No\.?)?[:\s]*([A-Za-z0-9]{6,22})/i,
  /Txn(?:Id|ID)?[:\s]*([A-Za-z0-9]{6,22})/i,
];

export function parseAmountPaise(text) {
  for (const re of AMOUNT_REGEXES) {
    const m = text.match(re);
    if (m) {
      const num = m[1].replace(/,/g, '');
      try {
        const rupees = parseFloat(num);
        if (!isNaN(rupees) && rupees > 0) return Math.round(rupees * 100);
      } catch (e) {}
    }
  }
  return null;
}

export function parseUtr(text) {
  for (const re of UTR_REGEXES) {
    const m = text.match(re);
    if (m) return m[1];
  }
  return null;
}

export function normalizeObservation(rawText) {
  return {
    amountPaise: parseAmountPaise(rawText),
    utr: parseUtr(rawText),
  };
}
