import { useColorScheme } from "react-native";
import { Colors, type ThemeColors } from "../constants/theme";

export function useColors(): ThemeColors {
  const scheme = useColorScheme();
  return Colors[scheme === "dark" ? "dark" : "light"];
}
