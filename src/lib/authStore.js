import { writable, derived } from 'svelte/store';

export const userStore = writable(null);
export const isLoginModalOpen = writable(false);
export const authLoading = writable(true);

export const isAdmin = derived(userStore, $user => $user && $user.role === 'admin');

export async function checkAuth() {
  authLoading.set(true);
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.authenticated && data.user) {
      userStore.set(data.user);
    } else {
      userStore.set(null);
    }
  } catch (err) {
    console.error('Auth check error:', err);
    userStore.set(null);
  } finally {
    authLoading.set(false);
  }
}

export async function loginUser(email, password) {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.success && data.user) {
      userStore.set(data.user);
      isLoginModalOpen.set(false);
      return { success: true, message: data.message };
    } else {
      return { success: false, error: data.error || 'Login failed' };
    }
  } catch (err) {
    return { success: false, error: err.message || 'Connection error' };
  }
}

export async function logoutUser() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (err) {
    console.error('Logout error:', err);
  } finally {
    userStore.set(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }
}
