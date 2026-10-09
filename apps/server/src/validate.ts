import type { ClientMessage, HostCommand } from '@saari/protocol';
import type { GameLength } from '@saari/rules';
import type { ActionSeconds } from './session.ts';

/** A validated POST /api/games body with the defaults filled in. */
export interface GameSettings {
  length: GameLength;
  actionSeconds: ActionSeconds;
  trial: boolean;
}

const LENGTHS: readonly unknown[] = ['normal', 'short'];
const ACTION_SECONDS: readonly unknown[] = [45, 60, 90];

type Obj = Record<string, unknown>;

const isObject = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isText = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;
const isCoord = (v: unknown): v is number => Number.isSafeInteger(v) && Math.abs(v as number) <= 10_000;

export function parseCreateGameRequest(value: unknown): GameSettings | null {
  if (!isObject(value) || !LENGTHS.includes(value.length)) return null;
  const actionSeconds = value.actionSeconds ?? 60;
  const trial = value.trial ?? false;
  if (!ACTION_SECONDS.includes(actionSeconds) || typeof trial !== 'boolean') return null;
  return { length: value.length as GameLength, actionSeconds: actionSeconds as ActionSeconds, trial };
}

/** Checks a decoded frame against ClientMessage and copies only the known fields. */
export function parseClientMessage(value: unknown): ClientMessage | null {
  if (!isObject(value)) return null;
  switch (value.t) {
    case 'hello-host':
      if (typeof value.protocol !== 'number' || !isText(value.code, 16) || !isText(value.hostToken, 256)) return null;
      return { t: 'hello-host', protocol: value.protocol, code: value.code, hostToken: value.hostToken };
    case 'hello-player': {
      const { protocol, code, nickname, playerToken } = value;
      if (typeof protocol !== 'number' || !isText(code, 16)) return null;
      if (nickname !== undefined && !isText(nickname, 100)) return null;
      if (playerToken !== undefined && !isText(playerToken, 256)) return null;
      return {
        t: 'hello-player',
        protocol,
        code,
        ...(nickname !== undefined ? { nickname } : {}),
        ...(playerToken !== undefined ? { playerToken } : {}),
      };
    }
    case 'inspect':
    case 'act':
      if (!isCoord(value.x) || !isCoord(value.y)) return null;
      return { t: value.t, x: value.x, y: value.y };
    case 'vote':
      return isText(value.option, 64) ? { t: 'vote', option: value.option } : null;
    case 'host': {
      const command = parseHostCommand(value.command);
      return command ? { t: 'host', command } : null;
    }
    case 'ping':
      return { t: 'ping' };
    default:
      return null;
  }
}

function parseHostCommand(value: unknown): HostCommand | null {
  if (!isObject(value)) return null;
  switch (value.type) {
    case 'start':
    case 'pause':
    case 'resume':
    case 'extend':
    case 'end':
      return { type: value.type };
    case 'rename':
    case 'kick':
      return isText(value.playerId, 64) ? { type: value.type, playerId: value.playerId } : null;
    case 'hide-names':
      return typeof value.hidden === 'boolean' ? { type: 'hide-names', hidden: value.hidden } : null;
    default:
      return null;
  }
}
