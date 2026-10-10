<script lang="ts" module>
  /** HUD icons rendered from the same Kenney models as the map (tools/art/kenney-icons.json). */
  export type ArtIconName = 'wood' | 'stone' | 'food' | 'shelter';
</script>

<script lang="ts">
  let { name, size = 32 }: { name: ArtIconName; size?: number } = $props();
</script>

<img
  class="art-icon"
  src="{import.meta.env.BASE_URL}art/kenney/icons/{name}.png"
  width={size}
  height={size}
  alt=""
  draggable="false"
/>

<style>
  .art-icon {
    flex: none;
    object-fit: contain;
    user-select: none;
  }
</style>
