import type { PublicTile } from '@saari/rules';
import { describe, expect, it } from 'vitest';
import { BUILDING_KINDS, LEVELS } from '../src/lib/enums.ts';
import {
  ART_STYLES,
  BUILDING_SCALE,
  kenneyBuilding,
  KENNEY_SCALE,
  KENNEY_TEXTURES,
  kenneyAnchorY,
  kenneyTile,
  landAround,
  parseArtStyle,
  rememberArtStyle,
  resolveArtStyle,
  type LandAround,
} from '../src/map/kenney.ts';

function tile(over: Partial<PublicTile> = {}): PublicTile {
  return {
    x: 3,
    y: 4,
    fog: false,
    exploreWork: 0,
    terrain: 'meadow',
    building: null,
    stock: 0,
    work: 0,
    uses: 0,
    ...over,
  };
}

const NO_LAND: LandAround = { xm: false, xp: false, ym: false, yp: false };
const ctx = (stockMax: number | null = null, coastal = false) => ({ stockMax, coastal });

describe('parseArtStyle', () => {
  it('accepts the known styles and falls back to the Kenney tiles (P37)', () => {
    for (const s of ART_STYLES) expect(parseArtStyle(s)).toBe(s);
    expect(parseArtStyle(null)).toBe('kenney');
    expect(parseArtStyle('pixel')).toBe('kenney');
    expect(parseArtStyle('kenney-beach')).toBe('kenney');
  });
});

describe('kenneyTile', () => {
  it('draws nothing in the placeholder style', () => {
    expect(kenneyTile(tile(), ctx(), NO_LAND, 'placeholder')).toBeNull();
  });

  it('uses grass for meadows, springs and building plots', () => {
    expect(kenneyTile(tile(), ctx(), NO_LAND, 'kenney')).toMatchObject({ texture: 'grass', flipX: false });
    expect(kenneyTile(tile({ terrain: 'spring' }), ctx(), NO_LAND, 'kenney')?.texture).toBe('grass');
    expect(kenneyTile(tile({ building: { kind: 'school', level: 1 } }), ctx(), NO_LAND, 'kenney')?.texture).toBe('grass');
  });

  it('uses dirt under fields and quarries', () => {
    expect(kenneyTile(tile({ terrain: 'field', stock: 30 }), ctx(30), NO_LAND, 'kenney')?.texture).toBe('dirt');
    expect(kenneyTile(tile({ terrain: 'quarry', stock: 60 }), ctx(60), NO_LAND, 'kenney')?.texture).toBe('dirt');
  });

  it('greys out a grass block under the fog and never shows the hidden terrain', () => {
    const s = kenneyTile(tile({ fog: true, terrain: null }), ctx(), NO_LAND, 'kenney');
    expect(s?.texture).toBe('grass');
    expect(s?.tint).not.toBe(0xffffff);
  });

  it('thins the forest as it is cut', () => {
    const at = (stock: number) => kenneyTile(tile({ terrain: 'forest', stock }), ctx(40), NO_LAND, 'kenney')?.texture;
    expect(['trees-2', 'trees-4', 'trees-7', 'trees-10']).toContain(at(40));
    expect(['trees-1', 'trees-3', 'trees-5', 'trees-8', 'trees-9', 'trees-11', 'trees-12']).toContain(at(20));
    expect(at(5)).toBe('trees-6');
  });

  it('varies rocks by tile, deterministically', () => {
    const rock = (x: number, y: number) => kenneyTile(tile({ x, y, terrain: 'rock' }), ctx(), NO_LAND, 'kenney')?.texture;
    expect(rock(1, 1)).toBe(rock(1, 1));
    const seen = new Set(Array.from({ length: 40 }, (_, i) => rock(i, i * 3)));
    expect(seen.size).toBeGreaterThan(2);
    for (const r of seen) expect(r).toMatch(/^rocks-[1-8]$/);
  });

  it('sets thin blocks (water, dirt) lower than grass, so details follow their surface', () => {
    const dy = (over: Partial<PublicTile>) => kenneyTile(tile(over), ctx(30, true), NO_LAND, 'kenney')?.surfaceDy;
    expect(dy({ terrain: 'meadow' })).toBe(0);
    expect(dy({ terrain: 'forest', stock: 30 })).toBe(0);
    expect(dy({ terrain: 'field', stock: 30 })).toBeCloseTo(16 * KENNEY_SCALE);
    expect(dy({ terrain: 'sea' })).toBeCloseTo(16 * KENNEY_SCALE);
    const beach = kenneyTile(tile({ terrain: 'sea' }), ctx(null, true), { ...NO_LAND, ym: true }, 'kenney');
    expect(beach?.surfaceDy).toBeCloseTo(16 * KENNEY_SCALE);
  });

  it('deepens the open sea and keeps the coast light, like the placeholder map', () => {
    const sea = (coastal: boolean) => kenneyTile(tile({ terrain: 'sea' }), ctx(null, coastal), NO_LAND, 'kenney')?.tint;
    expect(sea(true)).toBe(0xffffff);
    expect(sea(false)).not.toBe(0xffffff);
  });

  it('puts sand on the sea tiles towards the land, back edges first', () => {
    const sea = (land: Partial<LandAround>) => kenneyTile(tile({ terrain: 'sea' }), ctx(), { ...NO_LAND, ...land }, 'kenney');
    expect(sea({})).toMatchObject({ texture: 'water' });
    expect(sea({ ym: true })).toMatchObject({ texture: 'beach-ne', flipX: false });
    expect(sea({ xm: true })).toMatchObject({ texture: 'beach-nw', flipX: false });
    expect(sea({ xp: true })).toMatchObject({ texture: 'beach-se', flipX: false });
    expect(sea({ yp: true })).toMatchObject({ texture: 'beach-se', flipX: true });
    expect(sea({ ym: true, xp: true })).toMatchObject({ texture: 'beach-ne' });
  });
});

describe('textures and placement', () => {
  it('lists every texture kenneyTile can return', () => {
    const lands: LandAround[] = [NO_LAND, { ...NO_LAND, ym: true }, { ...NO_LAND, xm: true }, { ...NO_LAND, xp: true }, { ...NO_LAND, yp: true }];
    const returned = new Set<string>();
    for (let x = 0; x < 30; x++) {
      for (const terrain of ['sea', 'meadow', 'forest', 'rock', 'field', 'quarry', 'spring'] as const) {
        for (const stock of [0, 10, 20, 40]) {
          for (const land of lands) {
            const s = kenneyTile(tile({ x, y: x * 7, terrain, stock }), ctx(40), land, 'kenney');
            if (s) returned.add(s.texture);
          }
        }
      }
    }
    for (const t of returned) expect(KENNEY_TEXTURES).toContain(t);
  });

  it('scales the 132 px Kenney diamond to the map tile and anchors at its centre', () => {
    expect(KENNEY_SCALE * 132).toBeCloseTo(96);
    expect(kenneyAnchorY(99)).toBeCloseTo(33 / 99);
    expect(kenneyAnchorY(127)).toBeCloseTo(61 / 127);
  });
});

describe('resolveArtStyle', () => {
  const memory = () => {
    const data = new Map<string, string>();
    return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
  };

  it('takes ?art= from the address and remembers it', () => {
    const storage = memory();
    expect(resolveArtStyle('?mock=1&art=placeholder', storage)).toBe('placeholder');
    expect(resolveArtStyle('?mock=1', storage)).toBe('placeholder');
  });

  it('falls back to the Kenney tiles without a choice or storage, and ignores unknown values', () => {
    expect(resolveArtStyle('', null)).toBe('kenney');
    const storage = memory();
    expect(resolveArtStyle('?art=pixel', storage)).toBe('kenney');
  });

  it('survives a storage that throws (private mode)', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(resolveArtStyle('?art=placeholder', broken)).toBe('placeholder');
    expect(resolveArtStyle('', broken)).toBe('kenney');
  });
});

describe('landAround', () => {
  it('reads the four grid neighbours, counting fog as land and the map edge as sea', () => {
    const tiles = new Map<string, PublicTile>([
      ['2,1', tile({ x: 2, y: 1, terrain: 'forest' })],
      ['1,2', tile({ x: 1, y: 2, terrain: 'sea' })],
      ['3,2', tile({ x: 3, y: 2, fog: true, terrain: null })],
    ]);
    const at = (x: number, y: number) => tiles.get(`${x},${y}`);
    expect(landAround(at, 2, 2)).toEqual({ xm: false, xp: true, ym: true, yp: false });
  });
});

describe('rememberArtStyle', () => {
  it('stores a choice that the next page load picks up, and shrugs off a broken storage', () => {
    const data = new Map<string, string>();
    const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
    rememberArtStyle('placeholder', storage);
    expect(resolveArtStyle('', storage)).toBe('placeholder');
    const broken = {
      getItem: () => null,
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(() => rememberArtStyle('kenney', broken)).not.toThrow();
    expect(() => rememberArtStyle('kenney', null)).not.toThrow();
  });
});

describe('kenneyBuilding', () => {
  it('has a preloaded sprite reaching above the tile for every building kind and level', () => {
    for (const kind of BUILDING_KINDS) {
      for (const level of LEVELS) {
        const b = kenneyBuilding(tile({ building: { kind, level } }), 'kenney');
        expect(KENNEY_TEXTURES).toContain(b?.texture);
        expect(b?.top).toBeGreaterThan(20);
      }
    }
  });

  it('grows with the level', () => {
    const top = (level: 1 | 3) => kenneyBuilding(tile({ building: { kind: 'shelter', level } }), 'kenney')?.top ?? 0;
    expect(top(3)).toBeGreaterThan(top(1));
  });

  it('scales the sprite canvas so its 1 x 1 tile matches the map tile', () => {
    expect(BUILDING_SCALE * 264).toBeCloseTo(96);
  });

  it('draws nothing without a building, under the fog or in the placeholder style', () => {
    expect(kenneyBuilding(tile(), 'kenney')).toBeNull();
    expect(kenneyBuilding(tile({ building: { kind: 'school', level: 1 } }), 'placeholder')).toBeNull();
    expect(kenneyBuilding(tile({ fog: true, terrain: null, building: { kind: 'school', level: 1 } }), 'kenney')).toBeNull();
  });
});
