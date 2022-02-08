<script context="module">
  const faq = [
    {
      id: 'how',
      open: true,
      title: 'How does this work?',
      content: `<p>UPify is a web app that lives entirely in your web browser and uses UP’s API to access your account information. All communication with UP happens between your web browser and their servers. None of your information is transmitted to or stored on UPify’s web server in any way.</p>

      <p>UPify is open-source, so if you’re that way inclined feel free to <a href="https://github.com/jono-hayward/dd-upify" target="_blank">check out the source code on GitHub</a>.</p>`
    },
    {
      id: 'who',
      title: 'Who made this? And why?',
      content: `<figure class="portrait"></figure>

      <p>Hey! I'm <a href="https://twitter.com/jono_hayward" target="_blank">Jono Hayward</a> and I made UPify. I’m not affiliated with UP in any way beyond being a customer myself.</p>

      <p>Up is easily the best banking experience on a mobile device. But while they're focusing on mobile, I'm a big spreadsheet nerd and was missing the ability to track all my transactions on the big screen. I built UPify to let me satisfy this compulsion.</p>

      <p>I made UPify in my spare time. If you like what I’ve done here, feel free to <a href="https://ko-fi.com/ohnojono" target="_blank">buy me a coffee</a>.</p>`
    },
    {
      id: 'safety',
      title: 'How safe is my info?',
      content: `<p>In a word: <em>very.</em></p>

      <p>All of UPify's functionality uses the <a href="https://developer.up.com.au/" target="_blank">secure API provided by UP</a>. And they're pretty good at that stuff. All information is sent over a secure, encrypted connection, so it's just as safe as using the UP app on your phone.</p>

      <p>The only bit of personal information UPify keeps about you is your personal access token, so you can log in quickly without having to remember 136 characters of gibberish. And that token is stored encrypted in your browser's storage &mdash; <em>nothing</em> is transmitted to or stored on UPify's web server.</p>

      <p>UPify doesn't have ads or tracking of any kind. No cookies here, no siree.</p>`
    },
    {
      id: 'stop-using',
      title: 'What if I want to stop using UPify?',
      content: '<p>Easy! Just head to <a href="https://api.up.com.au/" target="_blank">api.up.com.au</a> and generate a new personal access token. The old token will stop working.</p>'
    }
  ];

  export function show_q( id ) {
    faq.forEach( q => {
      if ( id === q.id ) {
        q.element.setAttribute( 'open', 'open' );
      } else {
        q.element.removeAttribute( 'open' );
      }
    } );
  }
</script>

<style>
  details + details {
    margin-top: 32px;
  }
  summary {
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
    list-style: none;
    position: relative;
    cursor: pointer;
  }

  summary::-webkit-details-marker {
    display: none;
  }

  summary::before {
    content: '';
    position: absolute;
    top: 50%;
    left: -32px;
    width: 14px;
    height: 14px;
    border: 4px solid rgb(var(--text));
    border-width: 0 4px 4px 0;
    transform: translateY(-80%) rotate(45deg);
  }

  summary:focus {
    outline: none;
  }

  details[open] summary::before {
    transform: translateY(-40%) rotate(225deg);
  }

  h2 {
    margin: 0;
    color: rgb(var(--text));
  }

  :global(.portrait) {
    --size: calc(var(--gap) * 8 );
    width: var(--size);
    height: var(--size);
    background: rgb(var(--c-accent)) url('/me.jpg') no-repeat center / cover;
    background-blend-mode: multiply;
    float: left;
    margin: 1em 1em 0 0;
  }
</style>

{#each faq as q}
  <details bind:this={q.element} open={ q.open } on:click={ () => { faq.forEach( qu => { if( qu.element !== q.element ) qu.element.removeAttribute( 'open' ) } )} }>
    <summary><h2>{@html q.title }</h2></summary>
    {@html q.content }
  </details>
{/each}
