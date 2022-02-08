<script>
  import FlatPickr from 'svelte-flatpickr';
  import 'flatpickr/dist/flatpickr.css';

  import { createEventDispatcher } from 'svelte';

  import Icon from '$lib/Icon.svelte';
  import Box from '$lib/Box.svelte';
  import Autocomplete from '$lib/Autocomplete.svelte';
  import Debug from '$lib/Debug.svelte';

  import { tags, categories } from '$lib/store';
  import { iso_date, log } from '$lib/helpers';

  import '../flatpickr.css';

  const flatpickr_options = {
    mode: 'range',
    maxDate: new Date(),
    altInput: true,
    altFormat: 'j M Y',
    monthSelectorType: 'static'
  };

  const dispatch = createEventDispatcher();

  export let filters = {};
  let local_filters = {}, temp_filters = {};

  let dates = [], category = '', tag = '';

  export const clear_filters = ( auto_apply = true ) => {
    dates = [];
    category = '';
    tag = '';
    filters = {};
    local_filters = {};
    temp_filters = {};
    auto_apply && apply_filters();
  }


  let choose_taxonomy = chosen => {

    chosen = chosen.detail;

    if( 'categories' === chosen.type ) chosen.type = 'category';
    if( 'tags' === chosen.type ) chosen.type = 'tag';

    if ( chosen.value ) {
      log( 'Applying taxonomy filter', chosen.type, chosen.value );
      local_filters[`filter[${chosen.type}]`] = chosen.value;
    } else {
      log( 'Clearing taxonomy filter', chosen.type );
      delete local_filters[`filter[${chosen.type}]`];
      local_filters = local_filters;
    }

    apply_filters();

  }

  const choose_dates = chosen => {
    const dates = chosen.detail[0];
    if( dates.length === 2 ) {
      log( 'Applying date filters' );
      local_filters['filter[since]'] = iso_date( dates[0], 0, 0, 0 );
      local_filters['filter[until]'] = iso_date( dates[1], 23, 59, 59 );
      apply_filters();
    } else if ( dates.length === 0 ) {
      log( 'Clearing date filters' );
      delete local_filters['filter[since]'];
      delete local_filters['filter[until]'];
      apply_filters();
    } else {
      log( 'Not enough dates for a filter action either way' );
    }
  }

  const apply_filters = () => {
    log( 'Applying filters' );
    temp_filters = {};

    // Run through the filters and transform them into an object the UP API will accept
    Object.keys( local_filters ).forEach( f => {
      const val = local_filters[f];
      if( typeof local_filters[f] === 'object' && local_filters[f] !== null ) {
        temp_filters[f] = val.value;
      } else if ( val ) {
        temp_filters[f] = val;
      }
    } );
    filters = temp_filters;
    dispatch( 'applied_filters' );
  };
</script>

<style>

  main {
    background: rgb(var(--c-background));
    border-radius: 0 0 var(--gbr) var(--gbr);
    position: relative;
  }

  .date-picker {
    background: rgb(var(--c-background));
    display: flex;
    flex-flow: row nowrap;
  }
  .date-picker input {
    margin: 0;
    border: none;
    padding: var(--gap);
    background: none;
    font-size: 14px;
    height: 40px;
  }
  .date-picker input::placeholder {
    opacity: .45;
    font-weight: 200;
    color: rgb(var(--c-white));
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  header h5 {
    margin: 0;
  }
  header button {
    margin: 0;

    padding: 0;
    border: none;

    background: none;

    cursor: pointer;

    color: white;
    font-size: var(--font-small);
    text-decoration: underline;

    opacity: .25;
  }
  header button:hover {
    opacity: 1;
  }

  .button.icon {
    height: 40px;
    opacity: .45;
  }
  .button.icon:hover {
    opacity: 1;
  }

</style>

<header>
  <h5>Filter transactions:</h5>
  {#if filters && Object.values( filters ).some( a => a )}
  <button on:click={clear_filters}>Clear filters</button>
  {/if}
</header>

<Box title="Date range:">
  <main class="dates">
    <FlatPickr options={flatpickr_options} bind:value={dates} on:change={choose_dates} placeholder="Choose dates" element=".date-picker">
      <div class="date-picker">
        <input type="text" placeholder="Select dates..." data-input>
        <button aria-label="Clear selected dates" class="button  icon" data-clear hidden={dates.length === 0}><Icon name="delete" /></button>
      </div>
    </FlatPickr>
  </main>
</Box>
<Box title="Category:">
  <main>
    <Autocomplete on:select={choose_taxonomy} list={$categories} bind:value={category} placeholder="Choose a category" />
  </main>
</Box>
<Box title="Tag:">
  <main>
    <Autocomplete on:select={choose_taxonomy} list={$tags} bind:value={tag} placeholder="Choose a tag" />
  </main>
</Box>

<Debug title="Current filters:" content={filters} />
