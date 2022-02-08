<script>
  import { page } from '$app/stores';
  import { u, accounts } from '$lib/store.js';
  import { toggle_user_pref, logout } from '$lib/app';

  import Icon from '$lib/Icon.svelte';
  import Toggle from '$lib/Toggle.svelte';

  let show_menu;
  export let show_prefs;

  const debug_types = ['Accounts', 'Categories', 'Tags', 'Transactions', 'Custom'];

  // Close menus when user clicks outside
  window.addEventListener( 'click', e => {
    if ( !e.target.closest( 'aside.options' ) ) show_menu = null;
  } );


</script>

<style>

  nav {
    height: var(--header-height);
    margin: var(--gap);
    border-radius: var(--gbr);
    background: rgb(var(--c-brand));
    display: flex;
    flex-flow: row nowrap;
    justify-content: space-between;
    position: relative;
    box-shadow: 0 4px 8px rgba(var(--c-background-darker), .45), 0 -3px 0 rgba(0, 0, 0, .15) inset;
  }
  :global(body.high-contrast nav) {
    background: rgb(var(--c-border)) !important;
  }
  nav::before, nav::after {
    content: '';
    position: absolute;
    top: calc(var(--gap) * -1);
    right: calc(var(--gap) * -1);
    left: calc(var(--gap) * -1);
    height: calc(100% + 16px);

  }
  nav::before {
    background: rgba(var(--c-background-darker), 0);
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
    z-index: -2;
  }
  nav::after {
    background: linear-gradient(to bottom,rgba(var(--c-background-darker), .45), rgba(var(--c-background-darker), 1));
    z-index: -1;
  }

  menu {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .accounts {
    display: flex;
    flex-flow: row nowrap;
    flex: 1;
  }

  .accounts li {
    display: flex;
    flex-flow: column;
    justify-content: center;
    flex: 0 0 auto;
    margin: 0 calc(var(--gap) / 2);
  }
  @media screen and (max-width: 1280px) {
    .accounts li {
      margin: 0;
    }
  }
  .accounts a {
    flex: 1;
    position: relative;
    display: flex;
    flex-flow: column;
    justify-content: center;

    font-size: var(--font-small);
    font-weight: bold;
    text-transform: uppercase;
    padding: 0 calc(var(--gap) / 2) 3px;
  }
  .accounts a:hover::after, .accounts li[aria-current=page] a::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: rgb(var(--c-accent-blue));
    box-shadow: 0 0 8px rgba(var(--c-accent-blue), 1);
  }
  .accounts li:not([aria-current=page]) a:hover::after {
    opacity: .75;
    box-shadow: none;
  }


  .logo {
    width: calc(var(--gap) * 6);
    min-width: 60px;
    margin-top: -6%;
    margin-left: var(--gap);
  }

  a {
    text-decoration: none;
    color: inherit;
  }

  .menu-button {
    margin: 0;
    display: flex;
    flex-flow: row nowrap;
    justify-content: flex-start;
    align-items: center;
    text-align: left;
    padding: 0 var(--gap);
    color: rgba(var(--c-white), .65);
    cursor: pointer;
    background: none;
    border: none;
  }

  :global(.menu-button .icon) {
    width: 20px;
    height: 20px;
  }

  .menu-button:hover {
    color: rgba(var(--c-white), 1);
  }

  .menu-button span {
    position: absolute;
    opacity: 0;
  }

  .menu-button[data-open=true] {
    background: rgb(var(--c-white));
    color: rgb(var(--c-brand));
    border-color: rgb(var(--c-white));
    border-radius: var(--gbr) var(--gbr) 0 0;
  }
  .options {
    position: relative;
    display: flex;
    flex-flow: column;
    justify-content: center;
  }
  .options .menu-button {
    flex: 1;
    z-index: 1;
    padding-bottom: 3px;
  }
  .options menu {
    position: absolute;
    background: rgb(var(--c-white));
    top: 100%;
    right: 0;
    width: 240px;
    border-radius: var(--gbr) 0 var(--gbr) var(--gbr);
    padding: calc(var(--gap)/8);
    box-shadow: 0 4px 8px rgba(var(--c-background), .65);

    --text: var(--c-background);
  }
  .options li.divider {
    height: 1px;
    background: rgba(var(--c-border), .15);
    margin: calc(var(--gap) / 4);
  }
  .options menu a {
    padding: calc(var(--gap) / 2);
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
    border-radius: calc(var(--gbr) / 2);
    font-size: 14px;
    font-weight: 500;
    color: rgb(var(--text));
  }
  .options menu a > * {
    flex: 0 0 auto;
  }
  :global(.options menu .icon) {
    width: 20px;
    height: 20px;
  }
  .options menu a span {
    flex: 1;
    margin-left: calc(var(--gap) / 2);
  }
  .options menu a:hover {
    --text: var(--c-white);
    background: rgb(var(--c-brand));
  }
</style>

<nav>
  <h1>
    {#if $u.prefs.contrast}
    <img class="logo" src="/logo--high-contrast.svg" alt="UPify">
    {:else}
    <img class="logo" src="/logo.svg" alt="UPify">
    {/if}
  </h1>

  <menu class="accounts">
    {#each $accounts as a}<li aria-current={ a.id === $page.params.id ? 'page' : undefined }>
      <a href="/accounts/{a.id}">{a.attributes.displayName}</a>
    </li>{/each}
  </menu>

  {#if $u.prefs.debug}<aside class="options">
    <button class="menu-button" on:click={() => show_menu = show_menu === 'debug' ? null : 'debug'} data-open={show_menu === 'debug'}>
      <Icon name="debug" />
      <span>Debug options</span>
    </button>

    {#if show_menu === 'debug'}<menu>{#each debug_types as d}
      <li><a href="/debug/{d}" on:click={() => show_menu = null}>{d}</a></li>
    {/each}</menu>{/if}
  </aside>{/if}

  <aside class="options">
    <button class="menu-button" on:click={() => show_menu = show_menu === 'options' ? null : 'options'} data-open={show_menu === 'options'}>
      <Icon name="menu" />
      <span>Menu</span>
    </button>
    {#if show_menu === 'options'}
    <menu>
      <li><a href="/help" on:click={() => show_menu = false}>
        <Icon name="help" />
        <span>Help</span>
      </a></li>
      <li><a href="/privacy">
        <Icon name="padlock" />
        <span>Privacy</span>
      </a></li>
      <li><a href="https://ko-fi.com/ohnojono" target="_blank">
        <Icon name="heart" />
        <span>Support UPify</span>
        <Icon name="external" />
      </a></li>

      <li class="divider">&nbsp;</li>

      <li><a href="/contrast" on:click|preventDefault={() => toggle_user_pref( 'contrast', true )}>
        <Icon name="contrast" />
        <span>High contrast mode</span>
        <Toggle bind:on={$u.prefs.contrast} />
      </a></li>

      <li><a href="/prefs" on:click|preventDefault={() => { show_prefs = true; show_menu = null }}>
          <Icon name="prefs" />
          <span>Preferences</span>
        </a></li>

      <li class="divider">&nbsp;</li>

      <li><a href="/debug" on:click|preventDefault={() => toggle_user_pref( 'debug', true )}>
        <Icon name="debug" />
        <span>Debug mode</span>
        <Toggle bind:on={$u.prefs.debug} />
      </a></li>

      <li class="divider">&nbsp;</li>

      <li><a href="/logout" on:click|preventDefault={logout}>
        <Icon name="exit" />
        <span>Log out</span>
      </a></li>
    </menu>
    {/if}
  </aside>

</nav>
