<script lang="ts">
  import { PROP_CANVAS, PROP_TOPS } from '../map/kenney-props.ts';

  /**
   * A building (or other map sprite) as a picture for cards: the map's own sprite, cropped
   * to a square round what stands on the tile, so small and tall buildings both fill it.
   * `texture` null draws "nothing is built": a hammer crossed out.
   */
  let { texture, size = 96 }: { texture: string | null; size?: number } = $props();

  const crop = $derived.by(() => {
    const name = texture?.replace(/^props\//, '') ?? '';
    const top = PROP_TOPS[name] ?? PROP_CANVAS.originY;
    // From a little above the sprite's top down to the tile's front corner.
    const bottom = PROP_CANVAS.originY + PROP_CANVAS.tilePx / 4 + 12;
    const box = Math.min(PROP_CANVAS.width, Math.max(150, bottom - (PROP_CANVAS.originY - top) + 18));
    const scale = size / box;
    return {
      width: PROP_CANVAS.width * scale,
      left: -(PROP_CANVAS.originX - box / 2) * scale,
      top: -(bottom - box) * scale,
    };
  });
</script>

<span class="pic" style:width="{size}px" style:height="{size}px" aria-hidden="true">
  {#if texture}
    <img
      src="{import.meta.env.BASE_URL}art/kenney/{texture}.png"
      alt=""
      draggable="false"
      style:width="{crop.width}px"
      style:left="{crop.left}px"
      style:top="{crop.top}px"
    />
  {:else}
    <svg viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="19" fill="#fff" stroke="#b9c3cb" stroke-width="3" />
      <path d="M17 31 L28 20" stroke="#8d5a2b" stroke-width="4.5" stroke-linecap="round" />
      <path d="M24 15 L33 24 L29 28 L20 19 Z" fill="#7d8a93" />
      <path d="M12 36 L36 12" stroke="#d9534f" stroke-width="4" stroke-linecap="round" />
    </svg>
  {/if}
</span>

<style>
  .pic {
    position: relative;
    display: inline-grid;
    place-items: center;
    flex: none;
    overflow: hidden;
  }
  img {
    position: absolute;
    max-width: none;
    height: auto;
    user-select: none;
  }
  svg {
    width: 70%;
    height: 70%;
  }
</style>
