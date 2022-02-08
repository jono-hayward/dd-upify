<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  
  import { accounts } from '$lib/store.js';
  
  onMount( () => goto( `/accounts/${$accounts[0].id}` ) );
</script>