import { describe, expect, it } from 'vitest';
import { clampCamera, fitCamera, panBy, parkTile, playArea, screenToWorld, worldToScreen, zoomAt } from '../src/map/camera.ts';
import { isGameCode, normalizeCode, parseRoute } from '../src/lib/routes.ts';
import { backoffDelay } from '../src/net/websocket.ts';
import { isMock } from '../src/net/mode.ts';

describe('camera', () => {
  const bounds = { minX: -100, minY: -50, maxX: 100, maxY: 50 };

  it('fits the bounds in the view, centred', () => {
    const cam = fitCamera(bounds, 400, 300, 0, 10);
    expect(cam.scale).toBe(2);
    expect(worldToScreen(cam, 0, 0)).toEqual({ x: 200, y: 150 });
    expect(worldToScreen(cam, -100, 0).x).toBe(0);
  });

  it('zooms around the pointer, keeping that world point still', () => {
    const cam = { x: 10, y: 20, scale: 1 };
    const before = screenToWorld(cam, 150, 80);
    const zoomed = zoomAt(cam, 2, 150, 80);
    expect(zoomed.scale).toBe(2);
    const after = screenToWorld(zoomed, 150, 80);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
    expect(zoomAt(cam, 100, 0, 0).scale).toBe(3);
    expect(zoomAt(cam, 0.001, 0, 0).scale).toBe(0.3);
  });

  it('pans and never loses the island off screen', () => {
    const cam = panBy({ x: 0, y: 0, scale: 1 }, 5000, -5000);
    const clamped = clampCamera(cam, bounds, 400, 300, 50);
    const left = bounds.minX * clamped.scale + clamped.x;
    const bottom = bounds.maxY * clamped.scale + clamped.y;
    expect(left).toBeLessThanOrEqual(400 - 50);
    expect(bottom).toBeGreaterThanOrEqual(50);
  });
});

describe('parkTile: a tapped tile stays in sight', () => {
  // A phone of 375 x 667 as measured: the map is 550 px tall under the bar.
  const PHONE = { width: 375, height: 550 };
  const COVER = { top: 82, corner: 69, sheet: 217 };
  const HALF = 13;

  /** The free band on the phone: under the corners, above the sheet. */
  const top = COVER.top + COVER.corner;
  const sheetTop = PHONE.height - COVER.sheet;

  it('leaves a tile alone when it is already free on a phone', () => {
    expect(parkTile({ x: 180, y: 240 }, HALF, PHONE, COVER)).toBeNull();
  });

  it('moves a tile out from under the name button and the lifted meter', () => {
    // Where the old rule left it: at height * 0.2, behind the name button.
    const target = parkTile({ x: 188, y: 110 }, HALF, PHONE, COVER);
    expect(target).not.toBeNull();
    expect(target!.y - HALF).toBeGreaterThanOrEqual(top);
    expect(target!.y + HALF).toBeLessThanOrEqual(sheetTop);
    expect(target!.x).toBe(PHONE.width / 2);
  });

  it('moves a tile out from under the sheet', () => {
    const target = parkTile({ x: 180, y: 400 }, HALF, PHONE, COVER);
    expect(target!.y - HALF).toBeGreaterThanOrEqual(top);
    expect(target!.y + HALF).toBeLessThanOrEqual(sheetTop);
  });

  it('counts the whole tile, not only its centre', () => {
    expect(parkTile({ x: 180, y: top + 2 }, HALF, PHONE, COVER)).not.toBeNull();
    expect(parkTile({ x: 180, y: sheetTop - 2 }, HALF, PHONE, COVER)).not.toBeNull();
    expect(parkTile({ x: 180, y: top + HALF }, HALF, PHONE, COVER)).toBeNull();
    expect(parkTile({ x: 180, y: sheetTop - HALF }, HALF, PHONE, COVER)).toBeNull();
  });

  it('moves a tile in from the sides of a phone', () => {
    expect(parkTile({ x: 20, y: 240 }, HALF, PHONE, COVER)?.x).toBe(PHONE.width / 2);
    expect(parkTile({ x: 355, y: 240 }, HALF, PHONE, COVER)?.x).toBe(PHONE.width / 2);
  });

  it('parks near the top of a tall free band, so a sheet that grows does not push it out again', () => {
    const tall = { width: 375, height: 695 };
    const target = parkTile({ x: 180, y: 90 }, HALF, tall, { ...COVER, sheet: 150 })!;
    expect(target.y - HALF).toBeGreaterThanOrEqual(top);
    // Well above the middle of the band, and free of a sheet nearly twice as tall.
    expect(target.y + HALF).toBeLessThanOrEqual(tall.height - 290);
  });

  it('keeps the middle when the sheet leaves only a sliver', () => {
    // A phone's sheet at its 70 %: not a tile's height left between it and the meter.
    const cover = { ...COVER, sheet: 385 };
    expect(parkTile({ x: 180, y: 60 }, HALF, PHONE, cover)?.y).toBe((top + (PHONE.height - 385)) / 2);
  });

  it('a phone is what the page calls a phone: 640 px is still one', () => {
    const edge = { width: 640, height: 550 };
    expect(parkTile({ x: 320, y: 400 }, HALF, edge, COVER)).not.toBeNull();
    const tablet = { width: 641, height: 550 };
    expect(parkTile({ x: 180, y: 400 }, HALF, tablet, COVER)).toBeNull();
  });

  describe('on a tablet', () => {
    const TABLET = { width: 768, height: 900 };
    // Only the bar's corners count: the meter stays at the bottom and the popup at the right.
    const cover = { top: 72, corner: 69, sheet: 300 };

    it('leaves a tile alone left of the popup', () => {
      expect(parkTile({ x: 200, y: 400 }, HALF, TABLET, cover)).toBeNull();
      expect(parkTile({ x: 200, y: 72 + HALF }, HALF, TABLET, cover)).toBeNull();
    });

    it('moves a tile out from under the corners of the bar', () => {
      const target = parkTile({ x: 200, y: 60 }, HALF, TABLET, cover);
      expect(target).toEqual({ x: Math.min(768 * 0.4, 768 - 460), y: 900 * 0.45 });
    });

    it('moves a tile out from under the popup on the right', () => {
      expect(parkTile({ x: 600, y: 400 }, HALF, TABLET, cover)).not.toBeNull();
    });
  });
});

describe('routes', () => {
  it('parses every page', () => {
    expect(parseRoute('/', '')).toEqual({ name: 'home', code: null });
    expect(parseRoute('/opettaja', '')).toEqual({ name: 'create' });
    expect(parseRoute('/host/123456', '')).toEqual({ name: 'host', code: '123456' });
    expect(parseRoute('/play/654321', '?mock=1')).toEqual({ name: 'play', code: '654321' });
    expect(parseRoute('/debrief/abcdef0123456789', '')).toEqual({ name: 'debrief', token: 'abcdef0123456789' });
    expect(parseRoute('/tietosuoja', '')).toEqual({ name: 'privacy' });
    expect(parseRoute('/ohje/', '')).toEqual({ name: 'help' });
    expect(parseRoute('/host/12', '')).toEqual({ name: 'not-found' });
    expect(parseRoute('/nope', '')).toEqual({ name: 'not-found' });
  });

  it('/join?code= goes to the game or prefills the home page', () => {
    expect(parseRoute('/join', '?code=123456')).toEqual({ name: 'play', code: '123456' });
    expect(parseRoute('/join', '?code=123%20456')).toEqual({ name: 'play', code: '123456' });
    expect(parseRoute('/join', '?code=12')).toEqual({ name: 'home', code: '12' });
    expect(parseRoute('/join', '')).toEqual({ name: 'home', code: null });
  });

  it('normalises typed codes', () => {
    expect(normalizeCode('123 456')).toBe('123456');
    expect(normalizeCode('12-34-56-78')).toBe('123456');
    expect(isGameCode('123456')).toBe(true);
    expect(isGameCode('12345a')).toBe(false);
  });

  it('mock mode is only ?mock=1', () => {
    expect(isMock('?mock=1')).toBe(true);
    expect(isMock('?mock=0')).toBe(false);
    expect(isMock('')).toBe(false);
  });
});

describe('reconnect backoff', () => {
  it('grows exponentially with jitter and a cap', () => {
    expect(backoffDelay(0, 500, 8000, () => 1)).toBe(500);
    expect(backoffDelay(3, 500, 8000, () => 1)).toBe(4000);
    expect(backoffDelay(10, 500, 8000, () => 1)).toBe(8000);
    expect(backoffDelay(10, 500, 8000, () => 0)).toBe(4000);
  });
});

describe('playArea', () => {
  const tile = (x: number, y: number, over: Partial<{ fog: boolean; terrain: string | null }> = {}) => ({ x, y, fog: false, terrain: 'meadow', ...over });

  it('frames what has been explored, with two tiles of room round it', () => {
    const tiles = [tile(5, 5), tile(6, 5), tile(9, 9, { fog: true, terrain: null }), tile(0, 0, { terrain: 'sea' })];
    const area = playArea(tiles, { x: 5, y: 5 });
    const xs = area.map((c) => c.x);
    const ys = area.map((c) => c.y);
    expect(Math.min(...xs)).toBe(3);
    expect(Math.max(...xs)).toBe(8);
    expect(Math.min(...ys)).toBe(3);
    expect(Math.max(...ys)).toBe(7);
  });

  it('frames the landing when nothing is explored yet', () => {
    const area = playArea([tile(1, 1, { fog: true, terrain: null })], { x: 4, y: 4 });
    expect(area).toContainEqual({ x: 2, y: 2 });
    expect(area).toContainEqual({ x: 6, y: 6 });
  });
});
