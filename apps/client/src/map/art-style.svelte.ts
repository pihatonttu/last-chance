/** The map art of this page (V5 spike): `?art=` or the remembered choice; the demo panel switches it live. */
import { rememberArtStyle, resolveArtStyle, type ArtStyle } from './kenney.ts';

function browserStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export const art = $state({ style: resolveArtStyle(globalThis.location?.search ?? '', browserStorage()) });

export function setArtStyle(style: ArtStyle): void {
  art.style = style;
  rememberArtStyle(style, browserStorage());
}
