<script>

  export let open;

  import { onMount } from 'svelte';

  import { dndzone } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';

  import { users, userid } from '$lib/store';

  import Icon from '$lib/Icon.svelte';
  import Toggle from '$lib/Toggle.svelte';

  let temp_prefs = {};
  const flip_duration = 200;

  onMount( () => {
    temp_prefs = Object.assign( temp_prefs, $users[$userid].prefs );
  } );

  const apply = () => {
    $users[$userid].prefs = temp_prefs;
    open = false;
  }

  const reset = () => {
    temp_prefs = {
      debug: false,
      contrast: false,
      group_by_day: true,
      group_related: true,
      columns: [
        {
          id: 'time',
          label: 'Time',
          active: true
        },
        {
          id: 'description',
          label: 'Description',
          active: true
        },
        {
          id: 'category',
          label: 'Category',
          active: false
        },
        {
          id: 'status',
          label: 'Status',
          active: false
        },
        {
          id: 'amount',
          label: 'Amount',
          active: true
        }
      ]
    };
  }

  const handleSort = e => {
    temp_prefs.columns = e.detail.items;
  }

</script>

<style>

  header {
    padding: calc(var(--gap) * 2);
    padding-bottom: 0;
  }

  main {
    display: flex;
    flex-flow: row wrap;
    margin: 0 calc(var(--gap) * -1);
    padding: calc(var(--gap) * 2);
    padding-top: 0;
  }

  footer {
    background: rgba(var(--c-background), .15);
    padding: var(--gap) calc(var(--gap) * 2);
    display: flex;
    justify-content: space-between;
  }
  aside {
    flex: 1 1 50%;
    width: 320px;
    padding: calc(var(--gap));
  }

  h2 {
    margin-bottom: 0;
  }

  h5 {
    margin: 0 0 .5em;
  }

  h5:not(:first-child) {
    margin-top: 1.5em;
  }

  ul {
    list-style: none;
    margin: 0; padding: 0;
  }

  ul.opts li {
    display: flex;
    flex-flow: row wrap;
    align-items: center;
    justify-content: space-between;
  }
  ul.opts li + li {
    margin-top: calc(var(--gap) * 1);
  }
  ul.opts li label {
    flex: 1;
  }
  ul.opts li small {
    margin-top: .5em;
  }

  ul.cols {
    margin: .5em 0;
    border: 1px solid rgba(var(--c-border), .25);
  }
  ul.cols li {
    display: flex;
    padding: calc(var(--gap) * .5);
    padding-left: calc(var(--gap) * .25);
    align-items: center;
    cursor: default !important;
  }
  :global(ul.cols li > .grabber) {
    cursor: grab;
  }
  ul.cols li:focus {
    outline: none;
  }
  :global(ul.cols li > *) {
    opacity: .35;
    transition: opacity var(--snappy);
  }
  :global(ul.cols li.active > *) {
    opacity: 1;
  }
  ul.cols li + li {
    margin: 0;
    border-top: 1px solid rgba(var(--c-border), .25);
  }
  ul.cols li span {
    flex: 1;
    padding: 0 calc(var(--gap) * .25);
  }

  input[type=checkbox] {
    position: absolute;
    visibility: hidden;
  }
  small {
    color: rgb(var(--text));
    display: block;
    line-height: 1.4;
    opacity: .5;
  }
</style>

<header>
  <h2>Preferences</h2>
</header>

<main>

  <aside>

    <h5>Display</h5>
    <ul class="opts">
      <li>
        <input type="checkbox" bind:checked={temp_prefs.contrast} id="contrast">
        <label for="contrast">High contrast mode</label>
        <Toggle bind:on={temp_prefs.contrast} />
        <small>Change some of the user interface colours so they're easier to read.</small>
      </li>
      <li>
        <input type="checkbox" bind:checked={temp_prefs.group_by_day} id="group_by_day">
        <label for="group_by_day">Group transactions by day</label>
        <Toggle bind:on={temp_prefs.group_by_day} />
      </li>
      <li>
        <input type="checkbox" bind:checked={temp_prefs.group_related} id="group_related">
        <label for="group_related">Group related transactions</label>
        <Toggle bind:on={temp_prefs.group_related} />
      </li>
    </ul>

    <h5>Advanced</h5>
    <ul class="opts">
      <li>
        <input type="checkbox" bind:checked={temp_prefs.debug} id="debug">
        <label for="debug">Debug mode</label>
        <Toggle bind:on={temp_prefs.debug} />
        <small>Display your raw account and transaction data from the UP API.</small>
      </li>
    </ul>

  </aside>

  <aside>

    {#if temp_prefs.columns}
      <h5>Columns</h5>
      <ul class="cols"
        aria-label="Columns"
        use:dndzone={{
          items: temp_prefs.columns,
          flipDurationMs: flip_duration,
        }}
        on:consider={handleSort}
        on:finalize={handleSort}>
        {#each temp_prefs.columns as col (col.id)}
          <li aria-label={col.label} animate:flip={{ duration: flip_duration }} class={col.active ? 'active' : ''}>
            <Icon class="grabber" name="drag-handle"  />
            <span>{col.label}</span>
            <Toggle bind:on={col.active} />
          </li>
        {/each}
      </ul>
      <small>Show, hide and re-order the columns in your transaction tables.</small>
    {/if}

  </aside>

</main>

<footer>
  <button class="button  naked" on:click={reset}>Reset to defaults</button>
  <button class="button" on:click={apply}>Save</button>
</footer>
