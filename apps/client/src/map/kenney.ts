/**
 * Kenney CC0 map art (P9, P37). Which picture each tile gets is decided here, without
 * PixiJS, so it can be tested; the renderer only loads and places the textures.
 *
 * Every land tile is a Kenney "Tower Defense" grass block (public/art/kenney, copied by
 * tools/art/kenney-assets.py). What stands on it (forest, rocks, meadow flowers, fields, the
 * quarry, the spring, buildings, the boat at the landing) is rendered from Kenney 3D kits in
 * the same view (public/art/kenney/props, tools/art/kenney-props-spec.py). The sea is the
 * background with a shallow-water ring round the island; hidden land is under Kenney clouds,
 * and the places to explore now show a green box (both inspired by the original game).
 */
import type { PublicTile } from '@saari/rules';
import { TILE_W } from './iso.ts';
import { PROP_CANVAS, PROP_TOPS } from './kenney-props.ts';
import { tileHash } from './sprites.ts';

/** `placeholder` = the vector map, kept as the fallback when the art fails to load. */
export type ArtStyle = 'placeholder' | 'kenney';
export const ART_STYLES: readonly ArtStyle[] = ['placeholder', 'kenney'];
const DEFAULT_STYLE: ArtStyle = 'kenney';

export function parseArtStyle(value: string | null): ArtStyle {
  return ART_STYLES.find((s) => s === value) ?? DEFAULT_STYLE;
}

const ART_STYLE_KEY = 'saari.art';

type StyleStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Remembers the style for this browser's next page loads, if storage allows. */
export function rememberArtStyle(style: ArtStyle, storage: StyleStorage | null): void {
  try {
    storage?.setItem(ART_STYLE_KEY, style);
  } catch {
    // Not remembered; the choice lasts for this page load.
  }
}

/**
 * The map style for this browser: `?art=` in the address wins and is remembered, otherwise
 * the remembered choice, otherwise the Kenney art. Storage may be missing or throw
 * (private mode, blocked site data); the choice then lasts only for this page load.
 */
export function resolveArtStyle(search: string, storage: StyleStorage | null): ArtStyle {
  const asked = new URLSearchParams(search).get('art');
  if (asked !== null) {
    const style = parseArtStyle(asked);
    rememberArtStyle(style, storage);
    return style;
  }
  try {
    return parseArtStyle(storage?.getItem(ART_STYLE_KEY) ?? null);
  } catch {
    return DEFAULT_STYLE;
  }
}

export interface TileSprite {
  texture: string;
  /** Multiplied into the texture; 0xffffff = unchanged. */
  tint: number;
}

const PROPS = Object.keys(PROP_TOPS).map((name) => `props/${name}`);
const CLOUDS = ['clouds/cloud-1', 'clouds/cloud-2', 'clouds/cloud-3', 'clouds/cloud-4'] as const;
/** Pictures for the floating "+10" effects on the map (the HUD's icons). */
export const RESOURCE_ICONS = ['icons/wood', 'icons/stone', 'icons/food'] as const;

/** Every texture name kenneyTile, kenneyProp and kenneyCloud can return; the renderer preloads these. */
export const KENNEY_TEXTURES: readonly string[] = ['grass', ...PROPS, ...CLOUDS, ...RESOURCE_ICONS];

/** The Kenney top diamond is 132 x 66; the map's tiles are TILE_W wide. */
export const KENNEY_SCALE = TILE_W / 132;

/**
 * Vertical anchor that lines up the block bottoms: every picture ends in a 66 px diamond
 * and a side below it, so the point 66 px above the bottom goes on the tile centre.
 * Grass blocks have a 33 px side, which puts their top surface exactly on the centre.
 */
export function kenneyAnchorY(height: number): number {
  return (height - 66) / height;
}

/** The sea's surface, in world pixels below the land's top: most of the blocks' sides show. */
export const WATER_DY = Math.round(33 * KENNEY_SCALE * 0.75);

/** Grey for land under the fog: the shape is known, the contents are not. */
export const FOG_TINT = 0xb9c3cb;
/** Slightly different greens so the island does not look like a chessboard. */
const GRASS_TINTS = [0xffffff, 0xf3f8ee, 0xfafff2, 0xeef5ec] as const;

function pick<T>(list: readonly T[], x: number, y: number, salt = 0): T {
  return list[(tileHash(x, y) >>> salt) % list.length]!;
}

/** The block a land tile stands on; the sea has none (it is the background). */
export function kenneyTile(tile: PublicTile, style: ArtStyle): TileSprite | null {
  if (style === 'placeholder') return null;
  if (tile.fog || tile.terrain === null) return { texture: 'grass', tint: FOG_TINT };
  if (tile.terrain === 'sea') return null;
  return { texture: 'grass', tint: pick(GRASS_TINTS, tile.x, tile.y, 3) };
}

/** Shallow water round the island (the fishing water); the open sea is the background. */
export function kenneyWater(tile: PublicTile, ctx: { coastal: boolean }, style: ArtStyle): 'shallow' | null {
  if (style === 'placeholder' || tile.fog || tile.terrain !== 'sea') return null;
  return ctx.coastal ? 'shallow' : null;
}

/** Prop sprites are rendered at twice the 2D tiles' size, on one shared canvas. */
export const PROP_SCALE = TILE_W / PROP_CANVAS.tilePx;
export const PROP_ANCHOR = {
  x: PROP_CANVAS.originX / PROP_CANVAS.width,
  y: PROP_CANVAS.originY / PROP_CANVAS.height,
} as const;

export interface PropSprite {
  texture: string;
  /** Ground below the tile centre, in world pixels (the boat floats on the lower water). */
  dy: number;
}

const prop = (name: string, dy = 0): PropSprite => ({ texture: `props/${name}`, dy });

/** 1..3 by the stock left: fields and forests show how much is left. */
function stage(stock: number, max: number): number {
  const share = stock / Math.max(1, max);
  return share > 2 / 3 ? 3 : share > 1 / 3 ? 2 : 1;
}

/**
 * What stands on a tile, drawn on top of its block: a building, a forest by the wood left,
 * rocks, meadow grass, a field's crop, the quarry, the spring, or (on the sea next to the
 * landing) the boat the class came ashore in.
 */
export function kenneyProp(
  tile: PublicTile,
  ctx: { stockMax: number | null },
  style: ArtStyle,
  landingBoat = false,
): PropSprite | null {
  if (style === 'placeholder' || tile.fog) return null;
  if (tile.building) return prop(`${tile.building.kind}-${tile.building.level}`);
  const stock = tile.stock ?? 0;
  const max = ctx.stockMax ?? 1;
  switch (tile.terrain) {
    case 'field':
      return prop(`field-${stock <= 0 ? 0 : stage(stock, max)}`);
    case 'forest':
      return prop(`forest-${stage(stock, max)}${pick(['a', 'b'], tile.x, tile.y)}`);
    case 'rock':
      return prop(`rock-${pick(['a', 'b'], tile.x, tile.y, 2)}`);
    case 'meadow':
      return prop(`meadow-${pick(['a', 'b', 'c'], tile.x, tile.y, 5)}`);
    case 'quarry':
      return prop('quarry');
    case 'spring':
      return prop('spring');
    case 'sea':
      return landingBoat ? prop('boat', WATER_DY) : null;
    default:
      return null;
  }
}

/**
 * How a fogged tile looks: `explorable` (a green box: explored land is next to it, so it
 * can be explored now) or `hidden` (under a cloud). Mirrors the engine's rule: any of the
 * eight neighbours is explored land, never the sea.
 */
export function fogLook(
  tile: PublicTile,
  at: (x: number, y: number) => PublicTile | undefined,
  style: ArtStyle,
): 'explorable' | 'hidden' | null {
  if (style === 'placeholder' || !tile.fog) return null;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const n = at(tile.x + dx, tile.y + dy);
      if (n && !n.fog && n.terrain !== null && n.terrain !== 'sea') return 'explorable';
    }
  }
  return 'hidden';
}

/** Kenney clouds are 196-250 px wide; this makes them a little wider than a tile so they join up. */
export const CLOUD_SCALE = 0.55;

export interface CloudSprite {
  texture: string;
  /** Offset from the tile centre in world pixels, so the cloud cover does not look tiled. */
  dx: number;
  dy: number;
  flipX: boolean;
}

/** The cloud over hidden fog; the places to explore stay uncovered so their green box shows. */
export function kenneyCloud(
  tile: PublicTile,
  at: (x: number, y: number) => PublicTile | undefined,
  style: ArtStyle,
): CloudSprite | null {
  if (fogLook(tile, at, style) !== 'hidden') return null;
  const h = tileHash(tile.x, tile.y);
  return {
    texture: CLOUDS[h % CLOUDS.length]!,
    dx: ((h >>> 4) % 13) - 6,
    dy: ((h >>> 8) % 9) - 4 - 10,
    flipX: ((h >>> 12) & 1) === 1,
  };
}
