<script>
  import FAQ, { show_q } from '$lib/FAQ.svelte';
  import Login from '$lib/Login.svelte';

  let show_faq = false;
</script>

<style>
  article {
    display: flex;
    flex-flow: row nowrap;

    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
  }

  aside {
    flex: 1 1 50%;
    overflow: hidden;
    background-color: rgb(var(--c-brand));
    transition: background-color 650ms cubic-bezier(0.075, 0.820, 0.165, 1.000);
    margin: var(--gap);
  }
  aside.active {
    background-color: rgb(var(--c-accent));
  }

  aside.active section {
    transform: translate3d(0, -100%, 1px);
  }


  section {
    height: 100vh;
    flex: 0 0 100vh;
    padding: 0 7vw;
    display: flex;
    flex-flow: column;
    justify-content: center;
    transition: transform 650ms cubic-bezier(0.075, 0.820, 0.165, 1.000);
    overflow: auto;
    transform: translate3d(0, 0, 1px);
  }


  section.intro .logo {
    height: 110px;
    width: auto;
  }

  section.intro .button {
    background: rgb(var(--c-accent));
  }

  section.faq {
    --text: var(--c-background-darker);
  }

  section.faq header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 64px 0 16px;
    flex: 0 0 auto;
  }

  section.faq main {
    flex: 1 1;
    display: flex;
    flex-flow: column;
    justify-content: center;
  }

  section.faq .logo {
    height: 68px;
    width: auto;
  }

  aside.login {
    display: flex;
    flex-flow: column;
    justify-content: center;
    background: rgb(var(--c-background-darker));
    padding: 0 5vw;
  }

  aside.login div {
    position: relative;
  }

  p.large {
    text-shadow: 0 1px 2px rgba(0, 0, 0, .45);
  }
</style>

<svelte:head>
  <title>UPify &mdash; the missing UP desktop app</title>
</svelte:head>

<article>
  <aside class="about  { show_faq ? 'active' : ''}">

    <section class="intro"><div>
      <h1><img class="logo" src="/logo.svg" alt="UPify logo"></h1>
      <h2>See the whole picture</h2>
      <p class="large">
        Upify is a simple, <a href="#safety" on:click|preventDefault={ () => { show_q('safety'); show_faq = true } }>secure</a> way to see everything happening in your <a href="https://www.up.com.au" target="_blank">UP</a> account but on a screen that's, well,&nbsp;<em>bigger</em> (you size queen, you).
      </p>
      <button class="button" on:click={ () => show_faq = true }>Tell me more</button>
    </div></section>

    <section class="faq">
      <header>
        <img class="logo" src="logo--mono.svg" alt="UPify logo">
        <button class="button  naked" on:click={ () => show_faq = false }>Go back</button>
      </header>

      <main>
        <FAQ />
      </main>

    </section>

  </aside>

  <aside class="login"><div>
    <Login />
  </div></aside>
</article>
