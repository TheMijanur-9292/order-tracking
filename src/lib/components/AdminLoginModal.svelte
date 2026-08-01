<script>
  import { isLoginModalOpen, loginUser } from '$lib/authStore.js';

  let email = '';
  let password = '';
  let showPassword = false;
  let isSubmitting = false;
  let errorMessage = '';

  async function handleLogin() {
    if (!email || !password) {
      errorMessage = 'Please enter both email and password';
      return;
    }

    isSubmitting = true;
    errorMessage = '';

    try {
      const res = await loginUser(email, password);
      if (!res.success) {
        errorMessage = res.error || 'Invalid credentials';
      } else {
        email = '';
        password = '';
        errorMessage = '';
      }
    } catch (e) {
      errorMessage = 'Failed to connect to server';
    } finally {
      isSubmitting = false;
    }
  }

  function closeModal() {
    isLoginModalOpen.set(false);
    errorMessage = '';
  }
</script>

{#if $isLoginModalOpen}
  <div class="modal-overlay" on:click|self={closeModal}>
    <div class="modal-card login-modal-card" style="max-width:440px; padding:1.8rem;">
      <div class="modal-header" style="border-bottom:none; margin-bottom:0.5rem; padding-bottom:0;">
        <div style="display:flex; align-items:center; gap:0.75rem;">
          <div style="width:42px; height:42px; border-radius:12px; background:linear-gradient(135deg, rgba(37,99,235,0.15), rgba(147,51,234,0.15)); border:1px solid rgba(37,99,235,0.3); display:flex; align-items:center; justify-content:center; color:var(--primary-accent); font-size:1.2rem;">
            <i class="fa-solid fa-shield-halved"></i>
          </div>
          <div>
            <h3 style="font-family:'Outfit', sans-serif; font-size:1.25rem; font-weight:700; margin:0;">Admin Access</h3>
            <span style="font-size:0.78rem; color:var(--text-muted);">Sign in to unlock write & edit controls</span>
          </div>
        </div>
        <button class="btn-close" on:click={closeModal}>&times;</button>
      </div>

      {#if errorMessage}
        <div style="background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.3); color:var(--danger-accent); border-radius:var(--radius-sm); padding:0.65rem 0.85rem; font-size:0.82rem; margin:1rem 0; display:flex; align-items:center; gap:0.5rem;">
          <i class="fa-solid fa-circle-exclamation"></i>
          <span>{errorMessage}</span>
        </div>
      {/if}

      <form on:submit|preventDefault={handleLogin} style="margin-top:1rem;">
        <div class="form-group">
          <label for="admin-email">Admin Email Address</label>
          <div style="position:relative;">
            <i class="fa-solid fa-envelope" style="position:absolute; left:0.85rem; top:50%; transform:translateY(-50%); color:var(--text-muted); font-size:0.85rem;"></i>
            <input 
              id="admin-email"
              type="email" 
              class="form-control" 
              placeholder="Enter admin email address" 
              bind:value={email} 
              style="padding-left:2.4rem;" 
              required 
            />
          </div>
        </div>

        <div class="form-group" style="margin-top:1rem;">
          <label for="admin-password">Password</label>
          <div style="position:relative;">
            <i class="fa-solid fa-lock" style="position:absolute; left:0.85rem; top:50%; transform:translateY(-50%); color:var(--text-muted); font-size:0.85rem;"></i>
            <input 
              id="admin-password"
              type={showPassword ? 'text' : 'password'} 
              class="form-control" 
              placeholder="Enter admin password" 
              value={password}
              on:input={e => password = e.target.value}
              style="padding-left:2.4rem; padding-right:2.5rem;" 
              required 
            />
            <button 
              type="button" 
              on:click={() => showPassword = !showPassword}
              style="position:absolute; right:0.75rem; top:50%; transform:translateY(-50%); background:none; border:none; color:var(--text-muted); cursor:pointer; padding:0.2rem;"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              <i class="fa-solid {showPassword ? 'fa-eye-slash' : 'fa-eye'}"></i>
            </button>
          </div>
        </div>

        <div class="modal-footer" style="margin-top:1.25rem; border-top:none; padding-top:0;">
          <button type="button" class="btn btn-outline" on:click={closeModal} disabled={isSubmitting}>Cancel</button>
          <button type="submit" class="btn btn-primary" style="flex:1;" disabled={isSubmitting}>
            {#if isSubmitting}
              <i class="fa-solid fa-spinner fa-spin"></i> Signing In...
            {:else}
              <i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In as Admin
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
