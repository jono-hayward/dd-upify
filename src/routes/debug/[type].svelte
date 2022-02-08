<script>
  import { page } from '$app/stores';

  import { accounts, categories, tags, txcache } from '$lib/store';

  import Debug from '$lib/Debug.svelte';

  $: set_type( $page.params.type );

  let content = '';

  const set_type = () => {
    switch( $page.params.type ) {
    case 'Accounts':
      content = $accounts;
      break;
    case 'Categories':
      content = $categories;
      break;
    case 'Tags':
      content = $tags;
      break;
    case 'Transactions':
      content = $txcache;
      break;
    }
    window.dataset = content;
  }

</script>

<style>
  header {
    position: sticky;
    top: calc(var(--header-height) + var(--gap));
    padding: var(--gap) 0;
    background: rgb(var(--c-background-darker));
    z-index: 1;
  }
  h2 {
    margin: 0;
  }
</style>

<svelte:head>
  <title>{$page.params.type} debugging -- UPify</title>
</svelte:head>

<header>
  <h5>Debug</h5>
  <h2>{$page.params.type}</h2>
</header>

<main>
  <Debug content={content} sticky="false" />
</main>
