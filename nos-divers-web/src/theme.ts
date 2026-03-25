export type ThemeMode = "dark" | "light" | "system";

const THEME_KEY = "nos_divers_theme";

export function getTheme(): ThemeMode {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "dark" || saved === "light" || saved === "system") return saved;
  return "dark";
}

export function setTheme(mode: ThemeMode) {
  localStorage.setItem(THEME_KEY, mode);
  applyTheme(mode);
}

export function applyTheme(mode: ThemeMode) {
  document.documentElement.setAttribute("data-theme", mode);
}

export function initTheme() {
  applyTheme(getTheme());
}
