import { ExpoConfig, ConfigContext } from "expo/config";

const IS_DEV = process.env.APP_VARIANT === "development";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DEV ? "NoS Divers (Dev)" : "NoS Divers",
  slug: "nos-divers",
  version: "2.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "nosdivers",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    image: "./assets/images/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#0A1628",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: IS_DEV
      ? "com.nosdivers.app.dev"
      : "com.nosdivers.app",
    infoPlist: {
      CFBundleURLTypes: [
        {
          CFBundleURLSchemes: ["nosdivers"],
        },
      ],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundColor: "#0A1628",
    },
    package: IS_DEV
      ? "com.nosdivers.app.dev"
      : "com.nosdivers.app",
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [{ scheme: "nosdivers" }],
        category: ["DEFAULT", "BROWSABLE"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "single",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#0A1628",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: process.env.EAS_PROJECT_ID || "",
    },
  },
});
