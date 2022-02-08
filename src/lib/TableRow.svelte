<script>
  import { slide } from 'svelte/transition';

  import { tags, u } from '$lib/store';
  import { format, get_category, get_total } from '$lib/helpers';

  import Icon from '$lib/Icon.svelte';
  import Tags from '$lib/Tags.svelte';

  export let tx;
  export let grouped = false;

  $: columns = $u.prefs.columns.filter( col => col.active );

  let group;

  // Handle a group
  if ( Array.isArray( tx ) ) {
    group = {
      id: tx[0].id,
      description: tx[0].attributes.description,
      times: tx.map( t => t.attributes.createdAt ).sort( ( a, b ) => a > b ),
      amount: get_total( tx ),
      show_tx: false
    }
  }

  const add_tag = tag => {
    api.tags.add( tx.id, new_tag ).then( () => {
      tx.relationships.tags.data = [...tx.relationships.tags.data, {
        type: 'tags',
        id: new_tag
      }];
      refresh_tags();
      new_tag = '';
    } ).catch( err => log( 'Failed to add tag', err ) );
  }

  const remove_tag = tag => {
    api.tags.remove( tx.id, tag_id ).then( () => {
      tx.relationships.tags.data = tx.relationships.tags.data.filter( tag => tag.id !== tag_id );
      refresh_tags();
    } ).catch( err => log( 'Failed to remove tag', err ) );
  };

  const refresh_tags = () => api.get( 'tags' ).then( result => $tags = result.data );

  // console.log( 'Rowening tx', tx );

</script>

{#if group}

  <tr class="tx group" data-open={group.show_tx} on:click={() => group.show_tx = !group.show_tx}>
    {#each columns as col}<td data-col={col.id}>

      {#if col.id === 'time'}
        <small>{format.time( group.times[0] )}<br>- {format.time( group.times[group.times.length - 1] )}</small>
      {/if}

      {#if col.id === 'description'}
        <div>
          <h4>
            {group.description}
            <span class="count">{tx.length}&times;</span>
          </h4>
        </div>
      {/if}

      {#if col.id === 'amount'}
        <div><pre>{format.currency( Math.abs( group.amount ) )}</pre></div>
      {/if}

    </td>{/each}
  </tr>

  {#if group.show_tx}
  {#each tx as t}<svelte:self grouped={true} tx={t} />{/each}
  {/if}

{:else}

<tr class="tx  {grouped ? 'ingroup' :''}" on:click={() => tx.more_detail = !tx.more_detail} data-open={tx.more_detail}>

  {#each columns as col}<td data-col={col.id} aria-label={col.label}>

  {#if col.id === 'description'}
    <div>
      <h4>{tx.attributes.description}</h4>
      <div class="icons">
        {#if tx.relationships.transferAccount.data}
          {#if tx.attributes.amount.positive}
            <Icon name="transfer-in" />
          {:else}
            <Icon name="transfer-out" />
          {/if}
        {/if}

        {#if tx.attributes.description.match(/\brefund\b/gi) && !tx.relationships.transferAccount.data}
          <Icon name="transfer-in" />
        {/if}

        {#if tx.attributes.rawText && tx.attributes.rawText.includes('AFTERPAY')}
          <Icon name="afterpay" />
        {/if}

        {#if tx.attributes.rawText && tx.attributes.rawText.includes('Klarna')}
          <Icon name="klarna" />
        {/if}

        {#if tx.attributes.description === 'Interest'}
          <Icon name="interest" />
        {/if}

        {#if tx.attributes.description === 'ATM Cash Out'}
          <Icon name="atm" />
        {/if}

        {#if tx.attributes.description.match(/\bfee\b/gi)}
          <Icon name="fee" />
        {/if}
      </div>
    </div>
  {/if}

  {#if col.id === 'time'}
    {format.time( tx.attributes.createdAt )}
  {/if}

  {#if col.id === 'amount'}
    <div data-deposit={tx.attributes.amount.positive}>
      <pre>{#if tx.attributes.amount.positive}+{/if}{format.currency(Math.abs( tx.attributes.amount.value ))}</pre>
    </div>
    {#if tx.attributes.foreignAmount}
    <pre><small>{format.currency( Math.abs( tx.attributes.foreignAmount.value ) )} {tx.attributes.foreignAmount.currencyCode}</small></pre>
    {/if}
  {/if}

  {#if col.id === 'status'}
    {tx.attributes.status}
  {/if}

  {#if col.id === 'category'}
    {#if tx.relationships.parentCategory.data}
      { get_category( tx.relationships.parentCategory.data.id ).attributes.name } /
    {/if}
    {#if tx.relationships.category.data}
      { get_category( tx.relationships.category.data.id ).attributes.name }
    {:else}
      <em>None</em>
    {/if}
  {/if}

  </td>{/each}
</tr>

{#if tx.more_detail}<tr><td colspan={columns.length} class="more-detail">
  <div transition:slide>
    <aside class="main">

      <div class="datum  large">
        <header><h5>Merchant/payee:</h5></header>
        <main>
          <h3>{tx.attributes.rawText || tx.attributes.description}</h3>
        </main>
      </div>

        <div class="datum">
          <header><h5>Category:</h5></header>
          <main>
            {#if tx.relationships.parentCategory.data}
              { get_category( tx.relationships.parentCategory.data.id ).attributes.name } /
            {/if}
            {#if tx.relationships.category.data}
              { get_category( tx.relationships.category.data.id ).attributes.name }
            {:else}
              <em>None</em>
            {/if}
          </main>
        </div>

      {#if tx.attributes.message}
        <div class="datum  xl">
          <header><h5>Transfer message</h5></header>
          <main>
            {tx.attributes.message }
          </main>
        </div>
      {/if}

        <div class="datum">
          <header><h5>Status:</h5></header>
          <main>
            {tx.attributes.status}
          </main>
        </div>


        <div class="datum">
          <header><h5>Created:</h5></header>
          <main>
            { format.date( tx.attributes.createdAt ) }, { format.time( tx.attributes.createdAt ) }
          </main>
        </div>

        <div class="datum">
          <header><h5>Settled:</h5></header>
          <main>
            {#if tx.attributes.settledAt }
              { format.date( tx.attributes.settledAt ) }, { format.time( tx.attributes.settledAt ) }
            {:else}
              <em>Awaiting settlement</em>
            {/if}
          </main>
        </div>

    </aside>
    <aside class="tags">
      <Tags selected={tx.relationships.tags.data} on:add={add_tag} on:remove={remove_tag} />
    </aside>
  </div>
</td></tr>{/if}

{/if}
