/** ?mock=1 runs the game in the browser (MockTransport) instead of talking to the server. */
export function isMock(search: string = globalThis.location?.search ?? ''): boolean {
  return new URLSearchParams(search).get('mock') === '1';
}
