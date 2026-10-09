/**
 * Sound service stub (P18). Sounds play from the projector; students are muted by
 * default and can turn sound on for headphones. No audio files exist yet: `play` only
 * records what would play, so the call sites are ready for CC0 sounds later.
 */
import { prefs } from '../net/storage.ts';

export type SoundName =
  | 'phase-action'
  | 'phase-vote'
  | 'phase-summary'
  | 'tick'
  | 'built'
  | 'tie'
  | 'spring-found'
  | 'action'
  | 'game-end';

export type SoundRole = 'host' | 'player';

export class SoundService {
  readonly role: SoundRole;
  muted = $state(true);
  /** Last requested sound, for debugging until real audio exists. */
  last: SoundName | null = null;

  constructor(role: SoundRole) {
    this.role = role;
    const stored = prefs.get(`sound.${role}`);
    // Projector: sound on by default. Students: off by default (P18).
    this.muted = stored === null ? role === 'player' : stored === 'muted';
  }

  toggle(): void {
    this.setMuted(!this.muted);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    prefs.set(`sound.${this.role}`, muted ? 'muted' : 'on');
  }

  play(name: SoundName): void {
    if (this.muted) return;
    this.last = name;
    // No audio assets yet (P18: CC0 sounds later).
  }
}
