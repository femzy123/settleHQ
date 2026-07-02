export const THEME_STORAGE_KEY = "settlehq-theme";

export const themes = ["light", "dark"] as const;
export type Theme = (typeof themes)[number];

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

export function resolveTheme(
  storedTheme: string | null | undefined,
  systemPrefersDark: boolean,
): Theme {
  if (isTheme(storedTheme)) {
    return storedTheme;
  }

  return systemPrefersDark ? "dark" : "light";
}

export function getThemeBootScript() {
  return `(function(){try{var key='${THEME_STORAGE_KEY}';var stored=window.localStorage.getItem(key);var systemDark=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var theme=(stored==='light'||stored==='dark')?stored:(systemDark?'dark':'light');document.documentElement.dataset.theme=theme;document.documentElement.classList.toggle('dark',theme==='dark');document.documentElement.style.colorScheme=theme;}catch(error){document.documentElement.dataset.theme='light';document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light';}})();`;
}
