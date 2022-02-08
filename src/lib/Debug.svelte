<script>

  import { onMount } from 'svelte';
  import { u } from '$lib/store';

  import Highlight from "svelte-highlight";
  import json from "svelte-highlight/src/languages/json";
  import style from "svelte-highlight/src/styles/github-dark";

  export let content;
  export let title = '';
  export let sticky = true;

  $:code = JSON.stringify( content, null, 2);

</script>

<svelte:head>{@html style}</svelte:head>

<style>
  h5 {
    color: rgb(var(--c-accent));
    text-transform: none;
    text-shadow: 0 0 4px rgba(var(--c-accent), .65);
    font-family: var(--mono-font);
  }

  .debug {
    background: rgba(var(--c-overlay));
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
    border-radius: var(--gbr);
    overflow: scroll;
    max-width: 100%;
    margin-bottom: 0;
    padding: var(--gap);
  }

  :global(.debug pre) {
    margin: 0;
  }

  :global(.debug code.hljs) {
    font-family: var(--mono-font);
    background: none;
    font-size: .8em;
    padding: 0; margin: 0;
  }

  .debug[data-stuck=true] {
    position: sticky;
    bottom: 0;
    max-height: 25vh;
    overflow: auto;
    z-index: 3;
  }
</style>

{#if $u.prefs.debug}<div class="debug" data-stuck={sticky}>
  {#if title}<h5>{title}</h5>{/if}
  <Highlight language={json} {code} />
</div>{/if}
