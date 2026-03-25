export const Colors = {
  light: {
    primary: "#0066CC",
    background: "#F8FAFE",
    surface: "#FFFFFF",
    foreground: "#1A1A2E",
    muted: "#6B7280",
    border: "#D1D9E0",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
  },
  dark: {
    primary: "#4DA6FF",
    background: "#0D1117",
    surface: "#161B22",
    foreground: "#E6EDF3",
    muted: "#8B949E",
    border: "#30363D",
    success: "#3FB950",
    warning: "#D29922",
    error: "#F85149",
  },
} as const;

export type ThemeColors = (typeof Colors)["light"];
