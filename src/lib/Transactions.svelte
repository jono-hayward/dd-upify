<script>

  import { onMount } from 'svelte';

  import { u } from '$lib/store.js';
  import { format, get_total } from '$lib/helpers';

  import Icon from '$lib/Icon.svelte';
  import Debug from '$lib/Debug.svelte';
  import TableRow from '$lib/TableRow.svelte';

  export let account;
  export let txs;

  export const update_table = () => sort_tx( txs );

  import '../table.css';

  let sorted_tx = {};

  $: sort_tx( txs );

  $: columns = $u.prefs.columns.filter( col => col.active );

  const sort_tx = input_tx => {

    sorted_tx = {};
    input_tx && Object.values(input_tx).forEach( tx => {


      // Group the transactions by day
      if ( !sorted_tx[tx.dayref] ) {

        sorted_tx[tx.dayref] = {
          type: 'day',
          tx: [],
          open: true
        };

      }

      let today = sorted_tx[tx.dayref];

      // Group transaction matching
      let prev_tx = get_prev_tx( today.tx );
      let added = false;


      // Check if the current and previous txs share the same vendor/payee/whatever
      if ( prev_tx ) {
        if( prev_tx.el.attributes.description === tx.attributes.description ) {
          // Check if the current tx is within one hour of the previous one
          let comparison_date = new Date( prev_tx.el.attributes.createdAt.getTime() );
          comparison_date.setHours( comparison_date.getHours() - 1 );
          if ( tx.attributes.createdAt > comparison_date ) {
            // We've established the previous tx should be in a group with this one.
            // Now we have to figure out if it's in a group already or if we need to create one
            if( prev_tx.isInGroup ) {
              today.tx[today.tx.length - 1] = [...today.tx[today.tx.length - 1], tx];
              added = true;
            } else {
              // Remove the last element
              today.tx.pop();
              // ... and replace it with a new array
              today.tx = [...today.tx, [prev_tx.el, tx]];
              added = true;
            }
          }
        }
      }

      // There's no previous tx
      if ( !added ) {
        today.tx = [...today.tx, tx ];
      }


    } );



  };

  const get_prev_tx = txs => {
    let final_el = txs[ txs.length - 1 ];
    if( final_el ) {
      let in_array = Array.isArray( final_el );
      return {
        index: txs.length - 1,
        isInGroup: in_array,
        el: in_array ? final_el[ final_el.length - 1] : final_el
      };
    } else {
      return false;
    }
  }

</script>

<style>
  .day-header h5 {
    display: flex;
    flex-flow: row nowrap;
    justify-content: space-between;
    padding-right: calc(var(--gap) * 2.5);
  }
</style>

{#if sorted_tx}

<table>

  <thead>
    <tr>{#each columns as col}
      <th scope="col" data-col={col.id}>{col.label}</th>
    {/each}</tr>
  </thead>

  {#each Object.keys(sorted_tx) as d, i}<tbody data-open={sorted_tx[d].open}>

      {#if i > 0}<tr><td class="spacer" colspan={columns.length}>&nbsp;</td></tr>{/if}

      <tr class="day-header">
        <th scope="rowgroup" colspan={columns.length} on:click={() => sorted_tx[d].open = !sorted_tx[d].open}>
          <h5>
            <span>{format.date( new Date( d ) )}</span>
            {#if !sorted_tx[d].open}<span>
              {sorted_tx[d].tx.length} transaction{sorted_tx[d].tx.length !== 1 ? 's' : ''},
              ${format.currency( get_total( sorted_tx[d].tx ) )} spent
            </span>{/if}
          </h5>
        </th>
      </tr>

    {#if sorted_tx[d].open}

      {#each sorted_tx[d].tx as tx}
        <TableRow {tx} />
      {/each}

      {#if account.attributes.accountType === 'TRANSACTIONAL'}
        <tr class="tx  summary">{#each columns as col}
          <td data-col={col.id}>
          {#if col.id === 'amount'}
            <span data-tooltip="right" aria-label="Does not include any incoming funds or transfers between your own accounts/savers"><Icon name="info" /></span>
            <small>TOTAL</small>
            <div>
              <pre>{format.currency( get_total( sorted_tx[d].tx ) )}</pre>
            </div>
          {/if}
          </td>
        {/each}</tr>
      {/if}

    {/if}
    </tbody>{/each}

</table>

{:else}

<div class="loading">Loading...</div>

{/if}


<Debug content={sorted_tx} />
