export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'codex-theme';

export function getStoredTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    // armazenamento indisponível
  }
  return 'light';
}

export function applyTheme(mode: ThemeMode) {
  document.documentElement.classList.toggle('dark', mode === 'dark');
}

export function setTheme(mode: ThemeMode) {
  applyTheme(mode);
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // armazenamento indisponível
  }
  window.dispatchEvent(new CustomEvent('codex-theme-change', { detail: mode }));
}
