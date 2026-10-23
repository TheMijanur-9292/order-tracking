<script>
  import { onMount } from 'svelte';

  // Shows a toast in the parent page: notify(message, 'success' | 'error')
  export let notify = () => {};

  let currentPassword = '';
  let newPassword = '';
  let confirmPassword = '';
  let changingPassword = false;

  let adminUsers = [];
  let loadingAdmins = false;
  let newAdminEmail = '';
  let newAdminPassword = '';
  let addingAdmin = false;

  async function loadAdmins() {
    loadingAdmins = true;
    try {
      const res = await fetch('/api/admin-users');
      const data = await res.json();
      if (data.success) adminUsers = data.users;
      else notify(data.error || 'Failed to load admins', 'error');
    } catch (e) {
      notify('Failed to load admins', 'error');
    } finally {
      loadingAdmins = false;
    }
  }

  async function changePassword() {
    if (newPassword !== confirmPassword) {
      notify('New passwords do not match', 'error');
      return;
    }
    changingPassword = true;
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
      });
      const data = await res.json();
      if (data.success) {
        notify('Password changed. Other logged-in devices are signed out.');
        currentPassword = newPassword = confirmPassword = '';
      } else {
        notify(data.error || 'Failed to change password', 'error');
      }
    } catch (e) {
      notify('Failed to change password', 'error');
    } finally {
      changingPassword = false;
    }
  }

  async function addAdmin() {
    addingAdmin = true;
    try {
      const res = await fetch('/api/admin-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newAdminEmail, password: newAdminPassword })
      });
      const data = await res.json();
      if (data.success) {
        notify(`Admin ${newAdminEmail} added`);
        newAdminEmail = newAdminPassword = '';
        await loadAdmins();
      } else {
        notify(data.error || 'Failed to add admin', 'error');
      }
    } catch (e) {
      notify('Failed to add admin', 'error');
    } finally {
      addingAdmin = false;
    }
  }

  async function removeAdmin(user) {
    if (!confirm(`Remove admin ${user.email}? They will be signed out immediately.`)) return;
    try {
      const res = await fetch(`/api/admin-users/${user.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        notify(`Admin ${user.email} removed`);
        await loadAdmins();
      } else {
        notify(data.error || 'Failed to remove admin', 'error');
      }
    } catch (e) {
      notify('Failed to remove admin', 'error');
    }
  }

  onMount(loadAdmins);
</script>

<div class="account-grid">
  <div class="admin-box-card">
    <h3><i class="fa-solid fa-key" style="color:var(--amber-accent)"></i> Change My Password</h3>
    <form on:submit|preventDefault={changePassword} style="margin-top:1rem;">
      <div class="form-group">
        <label for="acc-current">Current Password</label>
        <input id="acc-current" type="password" class="form-control" autocomplete="current-password" bind:value={currentPassword} required />
      </div>
      <div class="form-group">
        <label for="acc-new">New Password (min 8 characters)</label>
        <input id="acc-new" type="password" class="form-control" autocomplete="new-password" minlength="8" bind:value={newPassword} required />
      </div>
      <div class="form-group">
        <label for="acc-confirm">Confirm New Password</label>
        <input id="acc-confirm" type="password" class="form-control" autocomplete="new-password" minlength="8" bind:value={confirmPassword} required />
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%;" disabled={changingPassword}>
        <i class="fa-solid fa-floppy-disk"></i> {changingPassword ? 'Saving...' : 'Change Password'}
      </button>
    </form>
  </div>

  <div class="admin-box-card">
    <h3><i class="fa-solid fa-user-shield" style="color:var(--emerald-accent)"></i> Admin Users</h3>

    {#if loadingAdmins}
      <p class="muted">Loading...</p>
    {:else}
      <ul class="admin-list">
        {#each adminUsers as user (user.id)}
          <li>
            <span><i class="fa-solid fa-user"></i> {user.email}{#if user.is_self} <em class="muted">(you)</em>{/if}</span>
            {#if !user.is_self}
              <button class="icon-btn icon-btn-danger" on:click={() => removeAdmin(user)} title="Remove Admin">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}

    <form on:submit|preventDefault={addAdmin} style="margin-top:1rem;">
      <div class="form-group">
        <label for="acc-admin-email">New Admin Email</label>
        <input id="acc-admin-email" type="email" class="form-control" autocomplete="off" bind:value={newAdminEmail} required />
      </div>
      <div class="form-group">
        <label for="acc-admin-pass">Initial Password (min 8 characters)</label>
        <input id="acc-admin-pass" type="password" class="form-control" autocomplete="new-password" minlength="8" bind:value={newAdminPassword} required />
      </div>
      <button type="submit" class="btn btn-emerald" style="width:100%;" disabled={addingAdmin}>
        <i class="fa-solid fa-user-plus"></i> {addingAdmin ? 'Adding...' : 'Add Admin'}
      </button>
    </form>
  </div>
</div>

<style>
  .account-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.25rem;
    max-width: 960px;
    margin: 1rem auto;
  }
  .admin-list {
    list-style: none;
    padding: 0;
    margin: 1rem 0 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .admin-list li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.6rem 0.8rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    font-size: 0.9rem;
  }
  .muted {
    color: var(--text-muted);
  }
</style>
