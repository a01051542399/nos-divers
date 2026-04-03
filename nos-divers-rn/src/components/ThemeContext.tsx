import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const lightColors = {
  bg: "#E8F4F8",
  surface: "#FFFFFF",
  text: "#023E58",
  muted: "#3D7A94",
  border: "#D1E6ED",
  primary: "#2196F3",
  error: "#F44336",
  success: "#4CAF50",
  warning: "#FF9800",
  card: "#FFFFFF",
  inputBg: "#F8FBFC",
};

export const darkColors = {
  bg: "#0D1117",
  surface: "#161B22",
  text: "#E6EDF3",
  muted: "#8B949E",
  border: "#30363D",
  primary: "#58A6FF",
  error: "#F85149",
  success: "#3FB950",
  warning: "#D29922",
  card: "#161B22",
  inputBg: "#0D1117",
};

interface ThemeContextType {
  mode: ThemeMode;
  theme: ResolvedTheme;
  setMode: (m: ThemeMode) => void;
  colors: typeof lightColors;
}

const STORAGE_KEY = "nos_divers_theme";

const ThemeContext = createContext<ThemeContextType>({
  mode: "system",
  theme: "light",
  setMode: () => {},
  colors: lightColors,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === "light" || saved === "dark" || saved === "system") {
        setModeState(saved);
      }
    });
  }, []);

  const setMode = async (m: ThemeMode) => {
    setModeState(m);
    await AsyncStorage.setItem(STORAGE_KEY, m);
  };

  const resolvedTheme: ResolvedTheme =
    mode === "system" ? (systemScheme === "dark" ? "dark" : "light") : mode;

  const colors = resolvedTheme === "dark" ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ mode, theme: resolvedTheme, setMode, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
