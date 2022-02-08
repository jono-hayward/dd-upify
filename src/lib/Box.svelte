<script>
  export let title;
  export let collapsible = false;
  export let open = true;
  export let nomargin = false;
</script>

<style>
  .box {
    --header-bg: var(--c-border);
    --header-text: var(--c-white);

    margin: var(--gap) 0;
    border-radius: var(--gbr) var(--gbr) 0 0;
  }
  .box.nomargin {
    margin: 0;
  }
  header {
    position: sticky;
    top: calc(var(--header-height) + var(--gap));
    padding: 1em var(--gap);

    background: rgb(var(--header-bg));

    font-size: var(--font-small);
    border-radius: var(--gbr) var(--gbr) 0 0;
    box-shadow: 0 1px 2px rgba(0, 0, 0, .25);
  }
  header:last-child {
    border-radius: var(--gbr);
  }
  header h3 {
    line-height: 1;
    text-transform: uppercase;
    color: rgb(var(--header-text));
    font-weight: bold;
    font-size: inherit;
  }

  .box[data-collapsible=true] header {
    cursor: pointer;
  }
  .box[data-collapsible=true] header::after {
    content: ' ';
    display: block;
    position: absolute;
    right: var(--gap);
    top: 50%;
    width: calc(var(--gap) / 2);
    height: calc(var(--gap) / 2);
    border: 2px solid rgb(var(--header-text));
    border-width: 0 2px 2px 0;
    transform: translateY(-75%) rotate(45deg);
  }
  .box[data-collapsible=true][data-open=true] header::after {
    transform: translateY(-25%) rotate(225deg);
  }

</style>

<div class="box  {nomargin ? 'nomargin': ''}" data-collapsible={collapsible} data-open={open}>
  <header on:click={() => open = !open}>
    <h3>{title}</h3>
  </header>
  {#if !collapsible || collapsible && open}
  <main><slot /></main>
  {/if}
</div>
