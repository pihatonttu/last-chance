<script lang="ts">
  import { t } from '../i18n/index.ts';
  import { href, router } from '../router.svelte.ts';
</script>

<footer class="footer no-print">
  <a href={href('/tietosuoja')} onclick={router.link}>{t('footer.privacy')}</a>
  <a href={href('/ohje')} onclick={router.link}>{t('footer.help')}</a>
</footer>

<style>
  .footer {
    display: flex;
    gap: 1.5rem;
    justify-content: center;
    padding: 1.5rem 1rem 2rem;
  }
  .footer a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    font-weight: 700;
  }
</style>
