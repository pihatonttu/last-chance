import type { ClientMessage } from '@saari/protocol';
import { describe, expect, it } from 'vitest';
import type { Transport } from '../src/net/transport.ts';
import { GameSession } from '../src/state/session.svelte.ts';

/** A session whose transport only records what it is asked to send. */
function recording() {
  const sent: ClientMessage[] = [];
  const transport: Transport = {
    connect: () => undefined,
    send: (message) => {
      sent.push(message);
      return true;
    },
    close: () => undefined,
    onMessage: () => () => undefined,
    onStatus: () => () => undefined,
  };
  return { sent, session: new GameSession('123456', transport, () => null) };
}

describe('GameSession.act', () => {
  it('sends the main action without an intent, as before', () => {
    const { sent, session } = recording();
    session.act(1, 2);
    expect(sent).toEqual([{ t: 'act', x: 1, y: 2 }]);
    expect(sent[0]).not.toHaveProperty('intent');
  });

  it('sends the demolish intent', () => {
    const { sent, session } = recording();
    session.act(1, 2, 'demolish');
    expect(sent).toEqual([{ t: 'act', x: 1, y: 2, intent: 'demolish' }]);
  });
});
