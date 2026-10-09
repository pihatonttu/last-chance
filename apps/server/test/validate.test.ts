import { describe, expect, it } from 'vitest';
import { parseClientMessage, parseCreateGameRequest } from '../src/validate.ts';

describe('parseCreateGameRequest', () => {
  it('fills the defaults', () => {
    expect(parseCreateGameRequest({ length: 'short' })).toEqual({ length: 'short', actionSeconds: 60, trial: false });
  });

  it('accepts every allowed value', () => {
    expect(parseCreateGameRequest({ length: 'normal', actionSeconds: 90, trial: true })).toEqual({
      length: 'normal',
      actionSeconds: 90,
      trial: true,
    });
  });

  it('rejects anything else', () => {
    for (const bad of [
      null,
      'short',
      [],
      {},
      { length: 'long' },
      { length: 'short', actionSeconds: 30 },
      { length: 'short', actionSeconds: '60' },
      { length: 'short', trial: 'yes' },
    ]) {
      expect(parseCreateGameRequest(bad)).toBeNull();
    }
  });
});

describe('parseClientMessage', () => {
  it('accepts every message of the protocol', () => {
    const good = [
      { t: 'hello-host', protocol: 1, code: '123456', hostToken: 'abc' },
      { t: 'hello-player', protocol: 1, code: '123456' },
      { t: 'hello-player', protocol: 1, code: '123456', nickname: 'Aino', playerToken: 'tok' },
      { t: 'inspect', x: 1, y: 2 },
      { t: 'act', x: 0, y: 0 },
      { t: 'vote', option: 'shelter-1' },
      { t: 'ping' },
      { t: 'host', command: { type: 'start' } },
      { t: 'host', command: { type: 'pause' } },
      { t: 'host', command: { type: 'resume' } },
      { t: 'host', command: { type: 'extend' } },
      { t: 'host', command: { type: 'end' } },
      { t: 'host', command: { type: 'rename', playerId: 'p1' } },
      { t: 'host', command: { type: 'kick', playerId: 'p1' } },
      { t: 'host', command: { type: 'hide-names', hidden: true } },
    ];
    for (const message of good) expect(parseClientMessage(message)).toEqual(message);
  });

  it('drops unknown fields', () => {
    expect(parseClientMessage({ t: 'act', x: 1, y: 2, evil: true })).toEqual({ t: 'act', x: 1, y: 2 });
  });

  it('rejects malformed messages', () => {
    const bad = [
      null,
      42,
      { t: 'nope' },
      { t: 'hello-host', protocol: '1', code: '123456', hostToken: 'abc' },
      { t: 'hello-host', protocol: 1, code: '123456' },
      { t: 'hello-player', protocol: 1, code: 123456 },
      { t: 'hello-player', protocol: 1, code: '123456', nickname: 5 },
      { t: 'hello-player', protocol: 1, code: '123456', nickname: 'x'.repeat(500) },
      { t: 'act', x: 1.5, y: 2 },
      { t: 'act', x: '1', y: 2 },
      { t: 'inspect', x: 1 },
      { t: 'vote', option: 3 },
      { t: 'host', command: { type: 'explode' } },
      { t: 'host', command: { type: 'kick' } },
      { t: 'host', command: { type: 'hide-names', hidden: 'yes' } },
      { t: 'host' },
    ];
    for (const message of bad) expect(parseClientMessage(message)).toBeNull();
  });
});
