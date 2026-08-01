<script>
  import '../app.css';
  import { onMount } from 'svelte';
  import { checkAuth } from '$lib/authStore.js';
  import AdminLoginModal from '$lib/components/AdminLoginModal.svelte';

  onMount(() => {
    checkAuth();
  });
</script>

<slot />
<AdminLoginModal />
