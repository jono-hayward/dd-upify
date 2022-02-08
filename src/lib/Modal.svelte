<script>
  export let open;
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';

  onMount( () => {
    window.addEventListener( 'keypress', e => {
      if ( e.key === 'Escape' ) open = false;
    } );
  } );
</script>

<style>
  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;

    z-index: 10;

    background: rgba(var(--c-background-darker), .65);
    -webkit-backdrop-filter: blur(12px);
            backdrop-filter: blur(12px);
  }

  .modal {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%,-50%);
    max-width: 80vw;
    background: rgb(var(--c-white));

    --heading-colour: var(--c-brand);
    --text: var(--c-background-darker);
  }

  .close-btn {
    position: absolute;
    top: 0;
    right: 0;
    width: calc(var(--gap) * 3);
    height: calc(var(--gap) * 3);
    margin: 0; padding: 0;
    background: none;
    border: none;
    line-height: 1;
    font-size: 2em;
    color: rgb(var(--heading-colour));
  }
</style>

{#if open}
  <div class="overlay" transition:fade={{ duration: 100 }} on:click={() => open = false}>
    <div
      class="modal"
      role="dialog"
      transition:scale={{ start: 0.8 }}
      on:click={(e) => e.stopPropagation()}>
      <slot />
      <button class="close-btn" aria-label="Modal close button" type="button" on:click={() => open = false}>&times;</button>
    </div>
  </div>
{/if}
