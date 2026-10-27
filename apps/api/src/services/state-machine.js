// Payment session state machine (ported from YOUPI PG).
// Valid transitions:
// INITIATED -> ACTIVE | CANCELLED
// ACTIVE -> PROCESSING | EXPIRED | CANCELLED
// PROCESSING -> SUCCESS | FAILED
// QUEUED -> ACTIVE

const TRANSITIONS = {
  INITIATED: ['ACTIVE', 'QUEUED', 'CANCELLED'],
  QUEUED: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['PROCESSING', 'EXPIRED', 'CANCELLED', 'SUCCESS'],
  PROCESSING: ['SUCCESS', 'FAILED'],
  SUCCESS: [],
  FAILED: [],
  EXPIRED: [],
  CANCELLED: [],
  SUSPICIOUS: [],
};

export function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

export function assertTransition(from, to) {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid state transition: ${from} -> ${to}`);
  }
}
