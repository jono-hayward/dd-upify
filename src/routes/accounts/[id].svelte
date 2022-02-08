<script>

  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { api } from '$lib/api.js';
  import { accounts, txcache } from '$lib/store.js';
  import { format, log } from '$lib/helpers';

  import Icon from '$lib/Icon.svelte';
  import Filter from '$lib/Filter.svelte';
  import Transactions from '$lib/Transactions.svelte';

  let account, store, data_table;

  let loading = false;

  let filters;
  let filter_chooser;
  let filter_store;

  let working = false;


  // Load when we navigate to a new account page
  $: load_account( $page.params.id );
  const load_account = async id => {

    filter_chooser && filter_chooser.clear_filters( false );

    filter_store = {
      next_page: '',
      data: []
    };

    account = $accounts[$accounts.findIndex( a => id === a.id )];
    if( account ) {
      if( !$txcache.hasOwnProperty( id ) ) {
        $txcache[id] = {
          next_page: '',
          data: [],
        };
      }

      if( !Object.keys($txcache[id].data).length ) {
        get_txn();
      } else {
        store = $txcache[id];
      }
    }

  };

  const refresh = () => {
    // Start the spinner
    working = true;
    // Clear the cached data for the current account
    $txcache[account.id].data = [];
    $txcache[account.id].next_page = '';
    Promise.all( [
      // Refresh the accounts listing which updates all the balances
      api.get( 'accounts' ).then( result => {
        $accounts = result.data;
        account = $accounts[$accounts.findIndex( a => account.id === a.id )];
      }),
      // Get transactions again
      get_txn()
    ]).then( () => {
      // Stop the spinner
      working = false;
    } );
  };


  const apply_filters = () => {
    // If this is being called, the filters have changed so we need to get a new store
    filter_store = {
      next_page: '',
      data: []
    };

    get_txn();
  }

  const get_txn = async () => {

    // Quick test to see if any of the filters have values
    const use_filters = filters && Object.values( filters ).some( a => a );

    // Store the response data in different stores depending on if it's filtered data or not
    if( use_filters ) {
      log( 'Using filter store' );
      store = filter_store;
    } else {
      log( 'Using normal txcache store' );
      store = $txcache[account.id];
    }

    // Begin the loading spinners
    loading = true;

    // Next, we're using different API calls if it's a first call or loading the next page.
    // If it's the next page of a filter call, the next_page url will already include the filter data so we don't need to include it in the API call
    let results;
    if ( store.next_page ) {
      results = await api.get_custom( store.next_page ).catch( err => log( err ) );
    } else {
      results = await api.get_txns_for_acct( account.id, filters ).catch( err => log( err ) );
    }
    loading = false;

    results.data.forEach( tx => {
      if( !store.data.hasOwnProperty( tx.id ) ) {
        // Preprocess some of the tx data for later
        // Convert the created/settled dates to date objects
        tx.attributes.createdAt = new Date( tx.attributes.createdAt );
        if ( tx.attributes.settledAt ) tx.attributes.settledAt = new Date( tx.attributes.settledAt );

        tx.dayref = tx.attributes.createdAt.toLocaleDateString( 'ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' } );

        // Parse the tx amount and add an attribute saying whether it's a deposit or a withdrawal
        tx.attributes.amount.value = parseFloat( tx.attributes.amount.value );
        tx.attributes.amount.positive = tx.attributes.amount.value > 0;

        // Finally, add the processed tx to the store.
        store.data.push( tx );
      }
    } );

    data_table.update_table();

    store.next_page = results.links.next;

  };

  const observer = new IntersectionObserver( entries => entries.forEach( e => e.isIntersecting && store.next_page && get_txn() ), { rootMargin: '0px 0px 100%' });

  onMount( () => {
    let target = document.querySelector( '[data-load-sentinel]' );
    observer.observe( target );
  } );


</script>

<style>

  .info {
    width: 320px;
    position: fixed;
    top: 74px;
    padding: var(--gap);
    height: calc(100vh - var(--header-height) - var(--gap) - var(--gap) );
    overflow: auto;

  }
  main {
    margin-left: 320px;
    padding-left: var(--gap);
  }

  @media screen and (max-width: 1000px) {
    .info {
      width: 240px;
    }
    main {
      margin-left: 240px;
    }
  }

  h2 {
    line-height: 1.2;
  }

  .datum h3 {
    color: rgb(var(--c-white));
    font-family: var(--mono-font);
  }

  .info > * + * {
    margin-top: calc(var(--gap) * 2);
  }

  .datum {
    position: relative;
  }
  .refresh {
    position: absolute;
    right: 0;
    bottom: 0;
    background: none;
    border: none;
    color: rgba(var(--c-white), .25);
    width: 32px;
    height: 32px;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  :global(.refresh.working .icon) {
    animation: spin 1s infinite linear;
  }
  .refresh:hover {
    color: rgba(var(--c-white), 1);
  }

  [data-load-sentinel] {
    display: flex;
    flex-flow: row nowrap;
    justify-content: center;
    opacity: .25;
  }
  [data-load-sentinel] h3 {
    padding: calc(var(--gap) * 4);
    font-weight: 300;
    text-transform: uppercase;
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
  }
  :global([data-load-sentinel] .icon) {
    margin-right: calc(var(--gap) * .5);
    animation: spin 1s infinite linear;
    width: 1.4em;
    height: 1.4em;
  }

  @keyframes spin {
    from {
      transform: none;
    }
    to {
      transform: rotate(360deg);
    }
  }

</style>

<svelte:head><title>{account ? account.attributes.displayName : 'Accounts'} &mdash; UPify</title></svelte:head>

<aside class="info">
  <div class="datum">
    <h5>{account.attributes.accountType} Account:</h5>
    <h2>{account.attributes.displayName}</h2>
  </div>

  <div class="datum">
    <h5>Current balance:</h5>
    <h3>${format.currency( account.attributes.balance.value )}</h3>
    <button type="button" class="refresh  {working ? 'working' : ''}" on:click={refresh} data-working={working}>
      <Icon name="refresh" />
    </button>
  </div>

  <div class="filters">
    <Filter bind:filters bind:this={filter_chooser} on:applied_filters={apply_filters} />
  </div>
</aside>

<main>
  <Transactions bind:this={data_table} bind:txs={store.data} bind:account={account} />
  <div data-load-sentinel>{#if loading}
    <h3><Icon name="refresh" />Loading&hellip;</h3>
  {/if}</div>
</main>
