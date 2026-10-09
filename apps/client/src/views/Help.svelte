<script lang="ts">
  import { t } from '../i18n/index.ts';
  import StaticPage from './StaticPage.svelte';
</script>

<StaticPage title={t('help.title')}>
  <p>{t('help.draft')}</p>
  <ol>
    <li>{t('help.1')}</li>
    <li>{t('help.2')}</li>
    <li>{t('help.3')}</li>
    <li>{t('help.4')}</li>
  </ol>
</StaticPage>
