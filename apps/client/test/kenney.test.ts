import type { PublicTile } from '@saari/rules';
import { describe, expect, it } from 'vitest';
import { BUILDING_KINDS, LEVELS } from '../src/lib/enums.ts';
import {
  ART_STYLES,
  fogLook,
  kenneyCloud,
  kenneyProp,
  KENNEY_SCALE,
  KENNEY_TEXTURES,
  kenneyAnchorY,
  kenneyTile,
  landAround,
  parseArtStyle,
  rememberArtStyle,
  resolveArtStyle,
  PROP_SCALE,
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

  it('puts meadows, springs, fields, quarries and building plots on a grass block at full height', () => {
    expect(kenneyTile(tile(), ctx(), NO_LAND, 'kenney')).toMatchObject({ texture: 'grass', flipX: false, surfaceDy: 0 });
    for (const over of [{ terrain: 'spring' }, { terrain: 'field', stock: 30 }, { terrain: 'quarry', stock: 60 }, { building: { kind: 'school', level: 1 } }] as const) {
      expect(kenneyTile(tile(over), ctx(60), NO_LAND, 'kenney')).toMatchObject({ texture: 'grass', surfaceDy: 0 });
    }
  });

  it('darkens a block under the fog and never shows the hidden terrain', () => {
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

  it('sets the thin water blocks lower than the land', () => {
    const dy = (over: Partial<PublicTile>) => kenneyTile(tile(over), ctx(30, true), NO_LAND, 'kenney')?.surfaceDy;
    expect(dy({ terrain: 'meadow' })).toBe(0);
    expect(dy({ terrain: 'forest', stock: 30 })).toBe(0);
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

describe('kenneyProp', () => {
  const prop = (over: Partial<PublicTile>, stockMax: number | null = null, wreck = false) =>
    kenneyProp(tile(over), ctx(stockMax), 'kenney', wreck);

  it('has a preloaded sprite reaching above the tile for every building kind and level', () => {
    for (const kind of BUILDING_KINDS) {
      for (const level of LEVELS) {
        const b = prop({ building: { kind, level } });
        expect(KENNEY_TEXTURES).toContain(b?.texture);
        expect(b?.top).toBeGreaterThan(20);
        expect(b?.dy).toBe(0);
      }
    }
  });

  it('grows buildings with the level', () => {
    const top = (level: 1 | 3) => prop({ building: { kind: 'shelter', level } })?.top ?? 0;
    expect(top(3)).toBeGreaterThan(top(1));
  });

  it('grows the crop on a field with the stock left: bare, sprouts, young, ripe', () => {
    const field = (stock: number) => prop({ terrain: 'field', stock }, 30)?.texture;
    expect(field(0)).toBe('props/field-0');
    expect(field(5)).toBe('props/field-1');
    expect(field(15)).toBe('props/field-2');
    expect(field(30)).toBe('props/field-3');
  });

  it('marks quarries and springs, and puts the wreck on the water surface', () => {
    expect(prop({ terrain: 'quarry', stock: 60 }, 60)?.texture).toBe('props/quarry');
    expect(prop({ terrain: 'spring' })?.texture).toBe('props/spring');
    const wreck = prop({ terrain: 'sea' }, null, true);
    expect(wreck?.texture).toBe('props/wreck');
    expect(wreck?.dy).toBeCloseTo(16 * KENNEY_SCALE);
  });

  it('only lists preloaded textures', () => {
    const fields = [0, 5, 15, 30].map((stock): Partial<PublicTile> => ({ terrain: 'field', stock }));
    for (const over of [{ terrain: 'quarry' }, { terrain: 'spring' }, ...fields] satisfies Partial<PublicTile>[]) {
      expect(KENNEY_TEXTURES).toContain(prop(over, 30)?.texture);
    }
    expect(KENNEY_TEXTURES).toContain(prop({ terrain: 'sea' }, null, true)?.texture);
  });

  it('draws nothing on bare terrain, under the fog or in the placeholder style', () => {
    for (const terrain of ['meadow', 'forest', 'rock', 'sea'] as const) expect(prop({ terrain, stock: 40 }, 40)).toBeNull();
    expect(prop({ fog: true, terrain: null, building: { kind: 'school', level: 1 } })).toBeNull();
    expect(kenneyProp(tile({ building: { kind: 'school', level: 1 } }), ctx(), 'placeholder')).toBeNull();
  });

  it('scales the sprite canvas so its 1 x 1 tile matches the map tile', () => {
    expect(PROP_SCALE * 264).toBeCloseTo(96);
  });
});

describe('fogLook', () => {
  const grid = (tiles: PublicTile[]) => {
    const byKey = new Map(tiles.map((t) => [`${t.x},${t.y}`, t]));
    return (x: number, y: number) => byKey.get(`${x},${y}`);
  };
  const fog = (x: number, y: number) => tile({ x, y, fog: true, terrain: null });

  it('marks fog next to explored land, diagonals included, as the place to explore (green box)', () => {
    const at = grid([tile({ x: 1, y: 1, terrain: 'meadow' }), fog(2, 2), fog(2, 1), fog(3, 3)]);
    expect(fogLook(fog(2, 2), at, 'kenney')).toBe('explorable');
    expect(fogLook(fog(2, 1), at, 'kenney')).toBe('explorable');
    expect(fogLook(fog(3, 3), at, 'kenney')).toBe('hidden');
  });

  it('does not count the sea or other fog as a place to explore from', () => {
    const at = grid([tile({ x: 1, y: 1, terrain: 'sea' }), fog(2, 1), fog(2, 2)]);
    expect(fogLook(fog(2, 2), at, 'kenney')).toBe('hidden');
  });

  it('is nothing for explored tiles or in the placeholder style', () => {
    const at = grid([tile({ x: 1, y: 1, terrain: 'meadow' }), fog(2, 2)]);
    expect(fogLook(tile({ x: 1, y: 1 }), at, 'kenney')).toBeNull();
    expect(fogLook(fog(2, 2), at, 'placeholder')).toBeNull();
  });
});

describe('kenneyCloud', () => {
  const fog = (x: number, y: number) => tile({ x, y, fog: true, terrain: null });
  const nothingKnown = () => undefined;

  it('covers hidden fog with one of the preloaded clouds, varied but stable per tile', () => {
    const cloud = (x: number, y: number) => kenneyCloud(fog(x, y), nothingKnown, 'kenney');
    expect(cloud(2, 3)).toEqual(cloud(2, 3));
    const seen = new Set(Array.from({ length: 40 }, (_, i) => cloud(i, i * 5)?.texture));
    expect(seen.size).toBeGreaterThan(2);
    for (const t of seen) expect(KENNEY_TEXTURES).toContain(t);
  });

  it('leaves the places to explore uncovered so their green box shows', () => {
    const known = tile({ x: 1, y: 1, terrain: 'meadow' });
    const at = (x: number, y: number) => (x === 1 && y === 1 ? known : undefined);
    expect(kenneyCloud(fog(2, 2), at, 'kenney')).toBeNull();
  });

  it('draws nothing over explored tiles or in the placeholder style', () => {
    expect(kenneyCloud(tile(), nothingKnown, 'kenney')).toBeNull();
    expect(kenneyCloud(fog(2, 2), nothingKnown, 'placeholder')).toBeNull();
  });
});
