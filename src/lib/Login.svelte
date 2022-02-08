<script>
  import { fade, fly } from 'svelte/transition';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  import CryptoJS from 'crypto-js';

  import { api } from '$lib/api.js';
  import { users, userid, token, logged_in, accounts, categories, tags } from '$lib/store.js';

  import Icon from '$lib/Icon.svelte';
  import Toggle from '$lib/Toggle.svelte';

  let input_account = {
    token: ''
  };
  let input_contrast = false;
  let input_password;
  let working = false;
  let status_message = '';

  let active_state;

  const trans_in = { y: 200, duration: 250 };
  const trans_out = { y: -200, duration: 250 };

  onMount( () => {
    if( Object.keys( $users ).length ) {
      active_state = 'users';
    } else {
      active_state = 'token';
    }
  } );

  function login( id, pass = input_password ) {
    if ( pass.length ) {

      // Use the supplied password as an encryption key to get the saved personal access token
      let decrypted_token = CryptoJS.AES.decrypt( $users[id].encrypted_token, pass ).toString(CryptoJS.enc.Utf8);

      // Check the decrypted value matches the expected format
      if( decrypted_token.length === 136 && decrypted_token.toLowerCase().substring(0, 8) === 'up:yeah:' ) {
        // Now we double check the token is valid and matched with the current user
        api.ping( decrypted_token ).then( result => {
          if ( result.meta.id === id ) {
            // If it does, we can log in
            $userid = id;
            $token = decrypted_token;

            // Load all the API data we need, then proceed
            Promise.all( [
              api.get( 'accounts' ).then( result => $accounts = result.data ),
              api.get( 'categories' ).then( result => $categories = result.data ),
              api.get( 'tags' ).then( result => $tags = result.data )
            ] ).then( () => {
              $logged_in = true;
              goto( `/accounts` );
            } );
          }
        } );
      } else {
        // If it doesn't, the password is probably wrong.
      }
    }
  }

  function add_new() {

    if ( input_account.token.length === 136 && input_account.token.toLowerCase().substring(0, 8) === 'up:yeah:' ) {
      // Looks like a valid token
      status_message = 'Talking to UP&hellip;'
      working = true;

      api.ping( input_account.token ).then( result => {
        input_account.id = result.meta.id;
        active_state = 'save';
      }, () => {
        status_message = 'Authentication failed';
        setTimeout( () => {
          working = false;
          status_message = '';
        }, 3000 );
      } );
    } else {

    }

  }

  function save_account() {
    let encrypted_token = CryptoJS.AES.encrypt( input_account.token, input_account.password ).toString();
    $users[ input_account.id ] = {
      name: input_account.nickname,
      encrypted_token: encrypted_token,
      prefs: {
        debug: false,
        contrast: input_contrast,
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
      }
    };
    login( input_account.id, input_account.password );
  }
</script>

<style>
  section {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 100%;
  }
  #token {
    font-family: var(--mono-font);
    /* font-size: 20px; */
    width: 100%;
    margin: 0 0 16px;
    resize: none;
  }
  input[type=password] {
    font-family: var(--mono-font);
    letter-spacing: .1em;
    font-size: 1.6em;
    line-height: 1rem;
    font-weight: bold;
    padding-left: .6em;
  }
  details {
    display: block;
    width: 100%;
  }
  summary {
    display: block;
    cursor: pointer;
  }
  summary:focus {
    outline: none;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  .button.naked {
    margin: 8px 0 0;
  }
  label {
    color: rgb(var(--c-brand));
    font-weight: bold;
    font-size: var(--font-small);
    text-transform: uppercase;
    margin: 0 0 calc(var(--gap) / 2);
  }

  input[type=checkbox] {
    position: absolute;
    visibility: hidden;
  }
  .form-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    --text: var(--c-brand);

    margin-bottom: 2em;
  }
  .form-item label {
    margin-left: 1em;
    margin-bottom: 0;
  }
</style>

<svelte:head><title>⚡️UPify &ndash; the missing UP desktop viewer</title></svelte:head>

{#if active_state === 'users'}<section in:fly={trans_in} out:fly={trans_out}>
  <h2>Welcome back.</h2>
  {#if Object.keys( $users ).length === 1}
  <p>Type your password in below to sign in.</p>
  {:else}
  <p>Choose your account from the list and type in your password to sign in.</p>
  {/if}

  {#each Object.keys($users) as u, i}
  <form on:submit|preventDefault={login(u)}><fieldset><details open={i === 0}>

    <summary><strong>{$users[u].name}</strong></summary>
    <label for="{u}_password">Password:</label>

    <div class="input-group">
      <input type="password" id="{u}_password" bind:value={input_password}>
      <button type="submit" class="inline-button">
        <Icon name="submit" />
        <span class="hidden">Log in</span>
      </button>
    </div>

  </details></fieldset></form>{/each}

  <button class="button  naked" on:click={() => active_state = 'token'}>Add new user</button>
</section>{/if}

{#if active_state === 'token'}<section in:fly={trans_in} out:fly={trans_out}>

  <h2>Hi there.</h2>
  <p>To get started, you’ll need to grab your UP personal access token. This is what lets UPify talk to UP and get your account details. Don’t worry, this will be easy.</p>
  <p>Head to <a href="https://api.up.com.au/" target="_blank">api.up.com.au</a> and follow the instructions there. Once you have your token, paste it into the field below and you’re golden.</p>

  <form on:submit|preventDefault={add_new}>
    <fieldset>
      <label for="token">Personal access token:</label>
      <textarea id="token" bind:value={input_account.token} rows="1" maxlength="136" on:input={ (e) => { e.target.style.height = '1px'; e.target.style.height = e.target.scrollHeight + 2 + 'px'; } }></textarea>
      <input type="submit" class="button" value="Let's go!" disabled={ input_account.token.length < 136 }>
      {#if working}<aside class="status" transition:fade>
        <span>{@html status_message}</span>
      </aside>{/if}
    </fieldset>
  </form>
  {#if Object.keys($users).length}<button class="button  naked" on:click={() => active_state = 'users'}>Go back</button>{/if}

</section>{/if}

{#if active_state === 'save'}<section in:fly={trans_in} out:fly={trans_out}>

  <h2>Fab, your token looks good <span class="emoji">👍</span></h2>
  <p>UPify will keep your token securely in your web browser's local storage. To keep it safe and allow you to log in quickly later on, please provide an account nickname and a password.</p>
  <p><strong>Important:</strong> Because this data is only stored in your browser, if you forget your password it cannot be reset or retrieved. If this happens you'll need to create a new personal access token and log in again from scratch.</p>

  <form on:submit|preventDefault={save_account}>
    <fieldset>

      <label for="nickname">Account nickname:</label>
      <input type="text" bind:value={input_account.nickname} id="nickname">

      <label for="password">Password:</label>
      <input type="password" bind:value={input_account.password} id="password">

      <div class="form-item">
        <Toggle bind:on={input_contrast} />
        <label for="contrast">Use high contrast mode</label>
        <input type="checkbox" bind:checked={input_contrast} id="contrast">
      </div>

      <input type="submit" class="button" value="Save account and log in" disabled={ input_account.nickname && input_account.nickname.length < 4 || !input_account.password }>
    </fieldset>
  </form>

</section>{/if}
