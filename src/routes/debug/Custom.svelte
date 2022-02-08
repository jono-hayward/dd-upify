<script>

  import { api } from '$lib/api';
  import Debug from '$lib/Debug.svelte';

  const base = 'https://api.up.com.au/api/v1/';

  let path;
  let params = [];

  let results;

  const run_query = async () => {
    results = null;
    console.log( 'Running query' );
    let submit_params = {};
    params.forEach( p => submit_params[p.key] = p.val );
    results = await api.get_custom( `${base}${path || 'transactions'}`, submit_params );
  };

  const add_param = () => params = [...params, { key: '', val: ''}];
  const remove_param = index => params = params.filter( (p, i) => i !== index );
</script>

<style>
  form {
    width: 100%;
    padding: var(--gap);
    border: 1px solid rgb(var(--c-border));
    background: rgb(var(--c-background));
  }
  form div {
    display: flex;
    flex-flow: row nowrap;
    font-size: var(--font-base);
    width: 100%;
  }
  h5:not(:first-child) {
    margin-top: calc(var(--gap)*2);
  }
  .input-prefix {
    flex: 0 0 auto;
    padding: 8px;
    background: rgba(var(--c-background-darker));
    border: 1px solid rgb(var(--c-border));
    border-radius: var(--gbr) 0 0 var(--gbr);
    border-right-width: 0;
    font-family: var(--mono-font);
  }
  input {
    border-radius: var(--gbr);
    border: 1px solid rgb(var(--c-border));
    background: rgb(var(--c-black));
    padding: 8px;
    margin: 0;
    flex: 1;
    color: rgb(var(--c-white));
    font-family: var(--mono-font);
  }
  .button {
    background: rgb(var(--c-accent-blue));
    color: rgb(var(--text));
    /* font-family: var(--ui-font);
    text-transform: uppercase;
    font-size: var(--font-small);
    font-weight: bold;
    width: auto;
    flex: 0 0 auto; */
  }
  input:focus {
    outline: none;
    border-color: rgb(var(--c-accent-blue));
  }
  .input-prefix + input {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }

  table {
    border-collapse: collapse;
    border: 1px solid rgb(var(--c-border));
  }
  td, th {
    border: 1px solid rgb(var(--c-border));
  }
  th {
    text-align: left;
    font-size: var(--font-small);
    text-transform: uppercase;
  }
  td {
    padding: calc(var(--gap) * .5);
  }
  td:last-child {
    width: 1%;
  }
</style>

<header>
  <h5>Debug</h5>
  <h2>Custom</h2>
</header>

<main>
  <form on:submit|preventDefault={run_query}>

    <h5>Path:</h5>
    <div>
      <label for="path" class="input-prefix">{base}</label>
      <input id="path" bind:value={path} placeholder="transactions">
    </div>

    <h5>Paramaters:</h5>
    <div>
      <table>
        {#if params.length}<thead>
          <tr>
            <th scope="col">Key</th>
            <th scope="col">Value</th>
            <th></th>
          </tr>
        </thead>
        <tbody>{#each params as p, i}
          <tr>
            <td><input type="text" bind:value={p.key}></td>
            <td><input type="text" bind:value={p.val}></td>
            <td><button type="button" class="button small" on:click={() => remove_param(i)}>Remove</button></td>
          </tr>
        {/each}</tbody>{/if}
        <tfoot>
          <tr>
            <td colspan="3"><button type="button" class="button small" on:click={add_param}>Add</button></td>
          </tr>
        </tfoot>
      </table>
    </div>
    <h5>All done?</h5>
    <div>
      <button type="submit" class="button">Run query</button>
    </div>
  </form>

  {#if results}
    <h5>Results</h5>
    <Debug content={results} sticky="false" />
  {/if}
</main>
