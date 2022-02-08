<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	import { u, logged_in, accounts } from '$lib/store';
	import { api } from '$lib/api';

	import Nav from '$lib/Nav.svelte';
	import Landing from '$lib/Landing.svelte';
	import Modal from '$lib/Modal.svelte';
	import Preferences from '$lib/Preferences.svelte';

	import '../app.css';

	let show_prefs = false;

	$: set_contrast( $u );
	const set_contrast = user => user && document.body.classList[ user.prefs.contrast ? 'add' : 'remove' ]('high-contrast');

	onMount( () => $logged_in && api.get( 'accounts' ).then( result => $accounts = result.data ) || goto( '/' ) );

</script>

<style>
	article {
		min-width: 768px;
	}
	.header {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 10;
	}

	.content {
		margin: 80px 16px 16px;
	}


</style>

<article>
	{#if $logged_in}
	<header class="header">
		<Nav bind:show_prefs />
	</header>
	<main class="content">
		<slot />
	</main>
	{:else}
	<Landing />
	{/if}
</article>

{#if $logged_in}
<Modal bind:open={show_prefs}>
	<Preferences bind:open={show_prefs} />
</Modal>
{/if}
