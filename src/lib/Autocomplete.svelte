<script>

  import Select from 'svelte-select';
  import { onMount, createEventDispatcher } from 'svelte';

  import Icon from '$lib/Icon.svelte';

  export let list;
  export let placeholder = 'Choose...';

  export let value;
  export let isCreatable = false;

  let type;

  const dispatch = createEventDispatcher();

  onMount( () => {
    const example = list[0];
    type = example.type;
    switch( type ) {
      case 'accounts':
        list = list.map( item => { return { value: item.id, label: item.attributes.displayName } } );
      break;
      case 'categories':
        list = list.map( item => { return { value: item.id, label: item.attributes.name } } );
      break;
      case 'tags':
        list = list.map( item => { return { value: item.id, label: item.id } } );
      break;
    }
  } );

  const select = e => dispatch( 'select', Object.assign( e.detail, { type: type } ) );
  const clear = () => dispatch( 'select', { type: type } );
</script>

<style>
  :global(.selectContainer) {
    width: 100%;
    font-size: 14px;
  }
  :global(.selectContainer input::placeholder) {
    color: white;
    opacity: .45;
    font-weight: 200;
  }

  :global(.selectContainer .clearSelect .icon) {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%,-50%);
    cursor: pointer;
  }

  :root {
    --border: none;
    --background: none;
    --padding: 0 var(--gap);
    --inputPadding: 0 var(--gap);

    --height: calc(var(--gap) * 2.5);

    --listBackground: rgb(var(--c-background-darker));
    --listBorderRadius: var(--gbr);
    --listBorder: 1px solid rgb(var(--c-border));
    --listShadow: 0 2px 4px rgba(0, 0, 0, .25);

    --itemHoverBG: rgb(var(--c-accent-blue));
    --itemFirstBorderRadius: var(--gbr) var(--gbr) 0 0;
    --itemLastBorderRadius: 0 0 var(--gbr) var(--gbr);

    --clearSelectColor: rgba(var(--c-white), .45);
    --clearSelectHoverColor: rgb(var(--c-white));
  }
  :global(body.high-contrast) {
    --itemHoverBG: rgb(var(--c-border));
  }
</style>

<Select items={list} {placeholder} ClearIcon={Icon} bind:value={value} on:select={select} on:clear={clear} {isCreatable} />
