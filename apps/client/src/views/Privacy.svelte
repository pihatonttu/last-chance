<script lang="ts">
  import { t } from '../i18n/index.ts';
  import StaticPage from './StaticPage.svelte';
</script>

<StaticPage title={t('privacy.title')}>
  <p>{t('privacy.draft')}</p>
  <ul>
    <li>{t('privacy.1')}</li>
    <li>{t('privacy.2')}</li>
    <li>{t('privacy.3')}</li>
    <li>{t('privacy.4')}</li>
    <li>{t('privacy.5')}</li>
  </ul>
</StaticPage>
