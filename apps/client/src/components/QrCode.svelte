<script lang="ts">
  import QRCode from 'qrcode';

  /** QR code generated in the browser; no third-party service (privacy for schools). */
  let { value, label, size = 240 }: { value: string; label: string; size?: number } = $props();

  let svg = $state('');

  $effect(() => {
    let cancelled = false;
    QRCode.toString(value, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#1d2a33', light: '#ffffff' } })
      .then((markup: string) => {
        if (!cancelled) svg = markup;
      })
      .catch(() => {
        if (!cancelled) svg = '';
      });
    return () => {
      cancelled = true;
    };
  });
</script>

<div class="qr" role="img" aria-label={label} style:width="{size}px" style:height="{size}px">
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- generated locally by qrcode from our own URL -->
  {@html svg}
</div>

<style>
  .qr {
    background: #fff;
    border-radius: var(--radius-small);
    padding: 8px;
    box-shadow: var(--shadow);
  }
  .qr :global(svg) {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
