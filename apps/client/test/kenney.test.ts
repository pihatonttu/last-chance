import type { PublicTile, Terrain } from '@saari/rules';
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
  kenneyWater,
  parseArtStyle,
  rememberArtStyle,
  resolveArtStyle,
  PROP_SCALE,
  WATER_DY,
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

const ctx = (stockMax: number | null = null, coastal = false) => ({ stockMax, coastal });
const LAND: Terrain[] = ['meadow', 'forest', 'rock', 'field', 'quarry', 'spring'];

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
    expect(kenneyTile(tile(), 'placeholder')).toBeNull();
  });

  it('puts every land tile on a grass block; what stands on it is a prop', () => {
    for (const terrain of LAND) expect(kenneyTile(tile({ terrain, stock: 30 }), 'kenney')?.texture).toBe('grass');
    expect(kenneyTile(tile({ building: { kind: 'school', level: 1 } }), 'kenney')?.texture).toBe('grass');
  });

  it('varies the grass a little per tile, deterministically, so the island does not look tiled', () => {
    const tint = (x: number, y: number) => kenneyTile(tile({ x, y }), 'kenney')?.tint ?? 0;
    expect(tint(2, 5)).toBe(tint(2, 5));
    const seen = new Set(Array.from({ length: 30 }, (_, i) => tint(i, i * 3)));
    expect(seen.size).toBeGreaterThan(1);
    for (const t of seen) for (const shift of [16, 8, 0]) expect((t >> shift) & 255).toBeGreaterThanOrEqual(0xe8);
  });

  it('greys a block under the fog and never shows the hidden terrain', () => {
    const s = kenneyTile(tile({ fog: true, terrain: null }), 'kenney');
    expect(s?.texture).toBe('grass');
    expect((s!.tint >> 16) & 255).toBeLessThan(0xe0);
  });

  it('leaves the sea to the background: no blocks, no grid', () => {
    expect(kenneyTile(tile({ terrain: 'sea' }), 'kenney')).toBeNull();
    expect(kenneyTile(tile({ terrain: 'sea' }), 'kenney')).toBeNull();
  });
});

describe('kenneyWater', () => {
  it('shows the shallow water next to the island, where the class can fish', () => {
    expect(kenneyWater(tile({ terrain: 'sea' }), ctx(null, true), 'kenney')).toBe('shallow');
    expect(kenneyWater(tile({ terrain: 'sea' }), ctx(null, false), 'kenney')).toBeNull();
  });

  it('is nothing on land or in the placeholder style', () => {
    expect(kenneyWater(tile(), ctx(null, true), 'kenney')).toBeNull();
    expect(kenneyWater(tile({ terrain: 'sea' }), ctx(null, true), 'placeholder')).toBeNull();
  });
});

describe('kenneyProp', () => {
  const prop = (over: Partial<PublicTile>, stockMax: number | null = null, wreck = false) =>
    kenneyProp(tile(over), ctx(stockMax), 'kenney', wreck);

  it('has a preloaded sprite for every building kind and level, a different one per level', () => {
    for (const kind of BUILDING_KINDS) {
      const textures = new Set<string | undefined>();
      for (const level of LEVELS) {
        const b = prop({ building: { kind, level } });
        expect(KENNEY_TEXTURES).toContain(b?.texture);
        expect(b?.dy).toBe(0);
        textures.add(b?.texture);
      }
      expect(textures.size).toBe(LEVELS.length);
    }
  });

  it('grows the crop on a field with the stock left: bare, sprouts, young, ripe', () => {
    const field = (stock: number) => prop({ terrain: 'field', stock }, 30)?.texture;
    expect(field(0)).toBe('props/field-0');
    expect(field(5)).toBe('props/field-1');
    expect(field(15)).toBe('props/field-2');
    expect(field(30)).toBe('props/field-3');
  });

  it('thins the forest as it is cut', () => {
    const forest = (stock: number) => prop({ terrain: 'forest', stock }, 40)?.texture;
    expect(forest(40)).toMatch(/^props\/forest-3[ab]$/);
    expect(forest(20)).toMatch(/^props\/forest-2[ab]$/);
    expect(forest(5)).toMatch(/^props\/forest-1[ab]$/);
  });

  it('varies rocks and meadows by tile, deterministically', () => {
    const look = (terrain: Terrain, x: number, y: number) => kenneyProp(tile({ x, y, terrain }), ctx(), 'kenney')?.texture;
    expect(look('rock', 1, 1)).toBe(look('rock', 1, 1));
    const rocks = new Set(Array.from({ length: 30 }, (_, i) => look('rock', i, i * 3)));
    const meadows = new Set(Array.from({ length: 30 }, (_, i) => look('meadow', i, i * 3)));
    expect(rocks.size).toBe(2);
    expect(meadows.size).toBe(3);
  });

  it('marks quarries and springs, and puts the boat the class came in on the water at the landing', () => {
    expect(prop({ terrain: 'quarry', stock: 60 }, 60)?.texture).toBe('props/quarry');
    expect(prop({ terrain: 'spring' })?.texture).toBe('props/spring');
    const boat = prop({ terrain: 'sea' }, null, true);
    expect(boat?.texture).toBe('props/boat');
    expect(boat?.dy).toBe(WATER_DY);
  });

  it('only returns preloaded textures', () => {
    for (let x = 0; x < 20; x++) {
      for (const terrain of LAND) {
        for (const stock of [0, 5, 15, 30, 40, 60]) {
          const p = kenneyProp(tile({ x, y: x * 7, terrain, stock }), ctx(terrain === 'forest' ? 40 : 30), 'kenney');
          if (p) expect(KENNEY_TEXTURES).toContain(p.texture);
        }
      }
    }
  });

  it('draws nothing on the open sea, under the fog or in the placeholder style', () => {
    expect(prop({ terrain: 'sea' })).toBeNull();
    expect(prop({ fog: true, terrain: null, building: { kind: 'school', level: 1 } })).toBeNull();
    expect(kenneyProp(tile({ building: { kind: 'school', level: 1 } }), ctx(), 'placeholder')).toBeNull();
  });
});

describe('textures and placement', () => {
  it('scales the 132 px Kenney diamond and the prop canvas to the map tile', () => {
    expect(KENNEY_SCALE * 132).toBeCloseTo(96);
    expect(PROP_SCALE * 264).toBeCloseTo(96);
    expect(kenneyAnchorY(99)).toBeCloseTo(33 / 99);
  });

  it('puts the water surface below the land, above the block bottoms', () => {
    expect(WATER_DY).toBeGreaterThan(0);
    expect(WATER_DY).toBeLessThan(33 * KENNEY_SCALE);
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
