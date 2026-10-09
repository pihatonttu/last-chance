<script lang="ts">
  import { t } from '../i18n/index.ts';
  import StaticPage from './StaticPage.svelte';
</script>

<StaticPage title={t('notFound.title')}>
  <p>{t('notFound.text')}</p>
</StaticPage>
