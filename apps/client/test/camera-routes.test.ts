import { describe, expect, it } from 'vitest';
import { clampCamera, fitCamera, panBy, screenToWorld, worldToScreen, zoomAt } from '../src/map/camera.ts';
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
