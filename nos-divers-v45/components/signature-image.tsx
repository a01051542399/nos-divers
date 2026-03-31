import { Platform, Image, View, StyleSheet } from "react-native";
import { SvgXml } from "react-native-svg";

interface SignatureImageProps {
  signatureData: string;
  width?: number | string;
  height?: number;
}

/**
 * Cross-platform signature image renderer.
 * - Web: uses <img> tag (handles SVG base64 natively)
 * - Native: decodes SVG base64 and renders with SvgXml (Image component can't render SVG data URIs)
 */
export function SignatureImage({ signatureData, width = "100%", height = 120 }: SignatureImageProps) {
  if (!signatureData) return null;

  if (Platform.OS === "web") {
    return (
      <img
        src={signatureData}
        style={{ width: typeof width === "number" ? width : "100%", height, objectFit: "contain" }}
        alt="서명"
      />
    );
  }

  // Native: try to decode SVG from base64 data URI
  if (signatureData.startsWith("data:image/svg+xml;base64,")) {
    try {
      const base64Part = signatureData.replace("data:image/svg+xml;base64,", "");
      // Decode base64 to SVG XML string
      const svgXml = decodeBase64(base64Part);
      if (svgXml && svgXml.includes("<svg")) {
        return (
          <View style={[styles.container, { height }]}>
            <SvgXml
              xml={svgXml}
              width={typeof width === "number" ? width : "100%"}
              height={height}
            />
          </View>
        );
      }
    } catch {
      // Fall through to Image component
    }
  }

  // Fallback: try Image component (works for PNG/JPEG data URIs)
  return (
    <Image
      source={{ uri: signatureData }}
      style={{ width: typeof width === "number" ? width : "100%" as any, height }}
      resizeMode="contain"
    />
  );
}

/**
 * Decode base64 string to UTF-8 text.
 * Works on both web (atob) and native (manual decode).
 */
function decodeBase64(base64: string): string {
  try {
    if (typeof atob !== "undefined") {
      // Web and modern RN
      const binaryStr = atob(base64);
      // Handle UTF-8 encoded content
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      return new TextDecoder("utf-8").decode(bytes);
    }
    // Node.js fallback
    return Buffer.from(base64, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
