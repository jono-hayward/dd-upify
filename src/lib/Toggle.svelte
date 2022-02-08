<script>
  export let on = false;

  const toggle = e => {
    e.stopPropagation();
    on = !on;
  }
</script>

<style>
  .outer {
    --border-width: 1.5px;
    --border: var(--border-width) solid rgb(var(--text));
    position: relative;
    border: var(--border);
    width: calc(1em * 1.5);
    height: 1em;
    border-radius: 1em;
    overflow: hidden;
  }
  .inner {
    position: absolute;
    top: calc(var(--border-width) * -1); left: calc(var(--border-width) * -1);
    border: var(--border);
    width: 1em;
    height: 1em;
    border-radius: 1em;
    transition: left var(--snappy);
    box-shadow: calc(1em * -1) 0 0 calc(1em * .5) rgb(var(--text)), 2px 0 2px rgba(var(--text), .25);
  }

  [data-on=true] .inner {
    left: calc(1em * .5 - var(--border-width));
  }
</style>

<div class="outer" data-on={on} on:click={toggle}>
  <div class="inner"></div>
</div>
