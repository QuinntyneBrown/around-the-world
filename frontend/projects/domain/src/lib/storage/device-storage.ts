/**
 * The browser's storage on the device for `DEVICE_STORAGE`, or null when reaching it throws
 * (a blocked or private browser): the game then plays with the defaults (L2-015 criterion 2).
 */
export function deviceStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
