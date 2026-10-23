// Light/dark theme helpers shared by all pages (the theme is stored in localStorage under "theme").

// Writes the theme onto <html data-theme="..."> (no-op during SSR).
export function setDocumentTheme(theme) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

export function getSavedTheme() {
  return localStorage.getItem('theme') || 'light';
}

export function saveTheme(theme) {
  localStorage.setItem('theme', theme);
}

export function getNextTheme(currentTheme) {
  return currentTheme === 'light' ? 'dark' : 'light';
}
