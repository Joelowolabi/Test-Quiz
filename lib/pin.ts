/**
 * Deterministically generates a memorable 6-digit classroom PIN from a test UUID.
 */
export function uuidToPin(uuid: string): string {
  if (!uuid) return "000000";
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    hash = ((hash << 5) - hash) + uuid.charCodeAt(i);
    hash |= 0;
  }
  const pin = Math.abs(hash % 900000) + 100000;
  return pin.toString();
}

/**
 * Formats a 6-digit PIN with a clean separator, e.g. "491 820"
 */
export function formatPin(pin: string): string {
  if (pin.length !== 6) return pin;
  return `${pin.slice(0, 3)} ${pin.slice(3)}`;
}
