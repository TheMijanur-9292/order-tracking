import { writable, derived } from 'svelte/store';

// Persistent LocalStorage Helper
function getSavedUser() {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('zomswi_admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }
  return null;
}

export const userStore = writable(getSavedUser());
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
      if (typeof window !== 'undefined') {
        localStorage.setItem('zomswi_admin_user', JSON.stringify(data.user));
      }
    } else {
      // If server explicitly fails authentication (and not logged in via cookie)
      userStore.set(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('zomswi_admin_user');
      }
    }
  } catch (err) {
    console.error('Auth check error:', err);
    // On network failure, preserve cached user from localStorage
    const cached = getSavedUser();
    if (cached) {
      userStore.set(cached);
    }
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
      if (typeof window !== 'undefined') {
        localStorage.setItem('zomswi_admin_user', JSON.stringify(data.user));
      }
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
      localStorage.removeItem('zomswi_admin_user');
      window.location.href = '/';
    }
  }
}
