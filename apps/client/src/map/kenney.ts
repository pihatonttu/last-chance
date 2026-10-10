/**
 * Kenney CC0 map art (P9, style C chosen in P37). Which picture each tile gets is decided
 * here, without PixiJS, so it can be tested; the renderer only loads and places the textures.
 *
 * Land blocks, trees and rocks come from Kenney "Tower Defense", water and beaches from
 * "Isometric Tiles Landscape", the fog clouds from "Background Elements" (public/art/kenney,
 * copied by tools/art/kenney-assets.py). Buildings, fields, the quarry, the spring and the
 * wreck are rendered from Kenney 3D kits in the same view (public/art/kenney/props,
 * tools/art/render-kenney.py). Only the badges and exploration rings stay vector (sprites.ts).
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

/** Which grid neighbours are land (fog counts: only land is ever fogged). */
export interface LandAround {
  /** x - 1: the tile's north-west edge on screen. */
  xm: boolean;
  /** x + 1: south-east edge. */
  xp: boolean;
  /** y - 1: north-east edge. */
  ym: boolean;
  /** y + 1: south-west edge. */
  yp: boolean;
}

/** The four grid neighbours of x, y; outside the map (undefined) is open sea. */
export function landAround(at: (x: number, y: number) => PublicTile | undefined, x: number, y: number): LandAround {
  const land = (t: PublicTile | undefined) => t !== undefined && (t.fog || t.terrain !== 'sea');
  return { xm: land(at(x - 1, y)), xp: land(at(x + 1, y)), ym: land(at(x, y - 1)), yp: land(at(x, y + 1)) };
}

export interface TileSprite {
  texture: string;
  /** Mirror horizontally (a south-west beach is the south-east one mirrored). */
  flipX: boolean;
  /** Multiplied into the texture; 0xffffff = unchanged. */
  tint: number;
  /**
   * How far below the tile centre the block's top surface lies, in world pixels. Thin
   * blocks (water, dirt) sit lower than grass; details drawn on them follow the surface.
   */
  surfaceDy: number;
}

const DENSE_FOREST = ['trees-2', 'trees-4', 'trees-7', 'trees-10'] as const;
const MEDIUM_FOREST = ['trees-1', 'trees-3', 'trees-5', 'trees-8', 'trees-9', 'trees-11', 'trees-12'] as const;
const SPARSE_FOREST = ['trees-6'] as const;
const ROCKS = ['rocks-1', 'rocks-2', 'rocks-3', 'rocks-4', 'rocks-5', 'rocks-6', 'rocks-7', 'rocks-8'] as const;
const PROPS = Object.keys(PROP_TOPS).map((name) => `props/${name}`);
const CLOUDS = ['clouds/cloud-1', 'clouds/cloud-2', 'clouds/cloud-3', 'clouds/cloud-4'] as const;

/** Every texture name kenneyTile, kenneyProp and kenneyCloud can return; the renderer preloads these. */
export const KENNEY_TEXTURES: readonly string[] = [
  'grass',
  'water',
  'beach-ne',
  'beach-nw',
  'beach-se',
  ...DENSE_FOREST,
  ...MEDIUM_FOREST,
  ...SPARSE_FOREST,
  ...ROCKS,
  ...PROPS,
  ...CLOUDS,
];

/** The Kenney top diamond is 132 x 66; the map's tiles are TILE_W wide. */
export const KENNEY_SCALE = TILE_W / 132;

/**
 * Vertical anchor that lines up the block bottoms: every picture ends in a 66 px diamond
 * and a side below it, so the point 66 px above the bottom goes on the tile centre.
 * Grass blocks have a 33 px side, which puts their top surface exactly on the centre;
 * taller pictures have trees or rocks above it.
 */
export function kenneyAnchorY(height: number): number {
  return (height - 66) / height;
}

/** Water blocks have a 17 px side instead of 33: their surface is 16 px below the land. */
const THIN_BLOCKS: ReadonlySet<string> = new Set(['water', 'beach-ne', 'beach-nw', 'beach-se']);
const THIN_DROP = 16 * KENNEY_SCALE;

/** Grey for land under the fog: the shape is known, the contents are not. */
export const FOG_TINT = 0xb9c3cb;
/** Open sea darker than the coast, as on the placeholder map; the coast keeps Kenney's water. */
export const OPEN_SEA_TINT = 0x9cc7ed;
const NO_TINT = 0xffffff;

function sprite(texture: string, flipX: boolean, tint: number): TileSprite {
  return { texture, flipX, tint, surfaceDy: THIN_BLOCKS.has(texture) ? THIN_DROP : 0 };
}

const plain = (texture: string, tint = NO_TINT): TileSprite => sprite(texture, false, tint);

function pick<T>(list: readonly T[], x: number, y: number): T {
  return list[tileHash(x, y) % list.length]!;
}

function seaSprite(land: LandAround, coastal: boolean): TileSprite {
  // Back edges first: the land in front of a sea tile hides its front edge anyway.
  if (land.ym) return plain('beach-ne');
  if (land.xm) return plain('beach-nw');
  if (land.xp) return plain('beach-se');
  if (land.yp) return sprite('beach-se', true, NO_TINT);
  return plain('water', coastal ? NO_TINT : OPEN_SEA_TINT);
}

export function kenneyTile(
  tile: PublicTile,
  ctx: { stockMax: number | null; coastal: boolean },
  land: LandAround,
  style: ArtStyle,
): TileSprite | null {
  if (style === 'placeholder') return null;
  if (tile.fog || tile.terrain === null) return plain('grass', FOG_TINT);
  if (tile.building) return plain('grass');
  switch (tile.terrain) {
    case 'sea':
      return seaSprite(land, ctx.coastal);
    case 'meadow':
    case 'spring':
    case 'field':
    case 'quarry':
      return plain('grass');
    case 'rock':
      return plain(pick(ROCKS, tile.x, tile.y));
    case 'forest': {
      const share = (tile.stock ?? 0) / Math.max(1, ctx.stockMax ?? 1);
      const set = share > 2 / 3 ? DENSE_FOREST : share > 1 / 3 ? MEDIUM_FOREST : SPARSE_FOREST;
      return plain(pick(set, tile.x, tile.y));
    }
  }
}

/** Prop sprites are rendered at twice the 2D tiles' size, on one shared canvas. */
export const PROP_SCALE = TILE_W / PROP_CANVAS.tilePx;
export const PROP_ANCHOR = {
  x: PROP_CANVAS.originX / PROP_CANVAS.width,
  y: PROP_CANVAS.originY / PROP_CANVAS.height,
} as const;

export interface PropSprite {
  texture: string;
  /** How far the sprite reaches above its ground, in world pixels (badge goes above buildings). */
  top: number;
  /** Ground below the tile centre, in world pixels (the wreck sits on the lower water). */
  dy: number;
}

function prop(name: string, dy = 0): PropSprite | null {
  const top = PROP_TOPS[name];
  return top === undefined ? null : { texture: `props/${name}`, top: top * PROP_SCALE, dy };
}

/** Field crop stage by the food left: bare soil, sprouts, young wheat, ripe wheat. */
function fieldStage(stock: number, max: number): number {
  if (stock <= 0) return 0;
  const share = stock / Math.max(1, max);
  return share > 2 / 3 ? 3 : share > 1 / 3 ? 2 : 1;
}

/**
 * What stands on a tile, drawn on top of its block: a building, a field's crop, the
 * quarry, the spring, or (on the sea tile next to the landing) the wreck.
 */
export function kenneyProp(
  tile: PublicTile,
  ctx: { stockMax: number | null },
  style: ArtStyle,
  wreck = false,
): PropSprite | null {
  if (style === 'placeholder' || tile.fog) return null;
  if (tile.building) return prop(`${tile.building.kind}-${tile.building.level}`);
  switch (tile.terrain) {
    case 'field':
      return prop(`field-${fieldStage(tile.stock ?? 0, ctx.stockMax ?? 1)}`);
    case 'quarry':
      return prop('quarry');
    case 'spring':
      return prop('spring');
    case 'sea':
      return wreck ? prop('wreck', THIN_DROP) : null;
    default:
      return null;
  }
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

/** The cloud over an unexplored tile (the original game also hid the unknown under clouds). */
export function kenneyCloud(tile: PublicTile, style: ArtStyle): CloudSprite | null {
  if (style === 'placeholder' || !tile.fog) return null;
  const h = tileHash(tile.x, tile.y);
  return {
    texture: CLOUDS[h % CLOUDS.length]!,
    dx: ((h >>> 4) % 13) - 6,
    dy: ((h >>> 8) % 9) - 4 - 10,
    flipX: ((h >>> 12) & 1) === 1,
  };
}
