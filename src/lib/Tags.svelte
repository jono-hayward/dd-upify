<script>
  import Autocomplete from '$lib/Autocomplete.svelte';

  import { createEventDispatcher } from 'svelte';
  import { slugify } from '$lib/helpers';
  import { tags } from '$lib/store';

  export let selected;

  const dispatch = createEventDispatcher();

  const add_tag = () => {
    const added_tag = {
      id: slugify( new_tag ),
      label: new_tag
    };
    selected = [...selected, added_tag];
    dispatch( 'add', { tag: added_tag } );
    new_tag = '';
  }

  const remove_tag = id => {
    selected = selected.filter( tag => tag.id !== id );
    dispatch( 'remove', { tag: { id: id } } );
  }

  let new_tag = '';
</script>

<style>

  ul {
    list-style: none;
    margin: 0;
    padding: 0 12px;
    display: flex;
    flex-flow: row wrap;
    align-items: stretch;
  }

  li {
    background: rgb(var(--c-brand));
    border-radius: calc(var(--gbr) / 2);
    padding: 0 8px;
    margin: calc(var(--gap) / 4);
    color: rgb(var(--c-white));
    font-size: var(--font-small);

    display: flex;
    flex-flow: row;
    align-items: center;
  }
  li.add {
    background: none;
    padding: 0;
    margin: 0;
    min-width: calc(var(--gap) * 16);
  }
  li.add:first-child {
    margin-left: -12px;
  }

  button {
    margin-left: 6px;
    color: inherit;
    background: none;
    border: none;
    padding: 0;
    width: 1em;
    height: 1em;
    position: relative;
  }
  button::before, button::after {
    content: '';
    width: 2px;
    height: 8px;
    position: absolute;
    top: 50%;
    left: 70%;
    background: rgb(var(--c-white));
  }
  button::before {
    transform: translate(-50%,-50%) rotate(-45deg);
  }
  button::after {
    transform: translate(-50%,-50%) rotate(45deg);
  }
</style>

<form on:submit|preventDefault={add_tag}>
  <ul>
    {#each selected as tag}<li>
      <span>{tag.id}</span>
      <button type="button" on:click={() => remove_tag( tag.id )}></button>
    </li>{/each}
    {#if selected.length < 6}<li class="add">
      <Autocomplete list={$tags} bind:value={new_tag} placeholder="Add a tag..." isCreatable="true" />
    </li>{/if}
  </ul>
</form>
