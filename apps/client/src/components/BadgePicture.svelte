<script lang="ts">
  import type { BadgeId } from '@saari/debrief';
  import ArtIcon, { type ArtIconName } from './ArtIcon.svelte';
  import Icon, { type IconName } from './Icon.svelte';
  import PropPicture from './PropPicture.svelte';

  /** A picture for each badge, from the map's own art where there is one (docs/09 §2.3). */
  const ART: Record<BadgeId, { icon: ArtIconName } | { prop: string } | { svg: IconName }> = {
    explorer: { svg: 'compass' },
    fisher: { icon: 'food' },
    lumberjack: { icon: 'wood' },
    farmer: { prop: 'props/field-3' },
    stonecutter: { icon: 'stone' },
    learner: { prop: 'props/school-1' },
    smith: { prop: 'props/workshop-1' },
    cheerer: { prop: 'props/gathering-1' },
    voter: { svg: 'vote' },
    settler: { prop: 'props/boat' },
  };

  let { badge, size = 56 }: { badge: BadgeId; size?: number } = $props();
  const art = $derived(ART[badge]);
</script>

<span class="badge-picture" style:width="{size}px" style:height="{size}px">
  {#if 'icon' in art}<ArtIcon name={art.icon} {size} />{:else if 'prop' in art}<PropPicture texture={art.prop} {size} />{:else}<Icon name={art.svg} {size} />{/if}
</span>

<style>
  .badge-picture {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: content-box;
    border-radius: 50%;
    background: var(--card-2);
    border: 3px solid var(--gold);
    padding: 0.35em;
  }
</style>
