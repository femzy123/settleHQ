import { describe, expect, it } from "vitest";

import { getThemeBootScript, isTheme, resolveTheme } from "./theme";

describe("theme helpers", () => {
  it("accepts only supported themes", () => {
    expect(isTheme("light")).toBe(true);
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("system")).toBe(false);
  });

  it("prefers saved theme over system preference", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("falls back to system preference when no saved theme exists", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(undefined, false)).toBe("light");
  });

  it("generates a pre-hydration script that sets theme attributes", () => {
    const script = getThemeBootScript();

    expect(script).toContain("settlehq-theme");
    expect(script).toContain("document.documentElement.dataset.theme");
    expect(script).toContain("classList.toggle");
    expect(script).toContain("prefers-color-scheme: dark");
  });
});
