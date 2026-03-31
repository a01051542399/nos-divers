import { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";
import { View, StyleSheet, Platform, PanResponder } from "react-native";
import Svg, { Path } from "react-native-svg";

interface SignaturePadProps {
  width: number;
  height: number;
  strokeColor?: string;
  strokeWidth?: number;
  backgroundColor?: string;
  borderColor?: string;
  onSignatureChange?: (hasSignature: boolean) => void;
}

export interface SignaturePadRef {
  clear: () => void;
  toBase64: () => string | null;
  isEmpty: () => boolean;
}

/**
 * SignaturePad - Uses PanResponder for reliable cross-platform touch handling.
 * The previous GestureDetector approach had issues with gesture conflicts in ScrollView.
 * PanResponder works reliably on both web and native for signature capture.
 */
export const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  function SignaturePad(
    {
      width,
      height,
      strokeColor = "#1A1A2E",
      strokeWidth = 2.5,
      backgroundColor = "#FFFFFF",
      borderColor = "#D1D9E0",
      onSignatureChange,
    },
    ref
  ) {
    const [paths, setPaths] = useState<string[]>([]);
    const currentPathRef = useRef<string>("");
    const [currentDrawing, setCurrentDrawing] = useState<string>("");
    const pathsRef = useRef<string[]>([]);
    const containerRef = useRef<View>(null);
    const layoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

    // Keep pathsRef in sync
    useEffect(() => {
      pathsRef.current = paths;
    }, [paths]);

    const clear = useCallback(() => {
      setPaths([]);
      setCurrentDrawing("");
      currentPathRef.current = "";
      pathsRef.current = [];
      onSignatureChange?.(false);
    }, [onSignatureChange]);

    const isEmpty = useCallback(() => {
      return pathsRef.current.length === 0;
    }, []);

    const toBase64 = useCallback(() => {
      const currentPaths = pathsRef.current;
      if (currentPaths.length === 0) return null;
      const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${backgroundColor}"/>${currentPaths.map((d) => `<path d="${d}" stroke="${strokeColor}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join("")}</svg>`;
      try {
        if (typeof btoa !== "undefined") {
          return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgContent)))}`;
        }
        return `data:image/svg+xml;base64,${Buffer.from(svgContent).toString("base64")}`;
      } catch {
        return `data:image/svg+xml;base64,${btoa(svgContent)}`;
      }
    }, [width, height, backgroundColor, strokeColor, strokeWidth]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({ clear, toBase64, isEmpty }), [clear, toBase64, isEmpty]);

    // Also maintain static ref for backward compatibility
    useEffect(() => {
      (SignaturePad as any)._ref = { clear, toBase64, isEmpty };
      return () => {
        (SignaturePad as any)._ref = null;
      };
    }, [clear, toBase64, isEmpty]);

    const getLocationInView = useCallback(
      (pageX: number, pageY: number): { x: number; y: number } => {
        // Use the measured layout position
        const layout = layoutRef.current;
        const x = Math.max(0, Math.min(pageX - layout.x, width));
        const y = Math.max(0, Math.min(pageY - layout.y, height));
        return { x, y };
      },
      [width, height]
    );

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: (evt) => {
          const { pageX, pageY } = evt.nativeEvent;
          const { x, y } = getLocationInView(pageX, pageY);
          currentPathRef.current = `M${x.toFixed(1)},${y.toFixed(1)}`;
          setCurrentDrawing(currentPathRef.current);
        },
        onPanResponderMove: (evt) => {
          const { pageX, pageY } = evt.nativeEvent;
          const { x, y } = getLocationInView(pageX, pageY);
          currentPathRef.current += ` L${x.toFixed(1)},${y.toFixed(1)}`;
          setCurrentDrawing(currentPathRef.current);
        },
        onPanResponderRelease: () => {
          if (currentPathRef.current) {
            const finishedPath = currentPathRef.current;
            setPaths((prev) => {
              const newPaths = [...prev, finishedPath];
              pathsRef.current = newPaths;
              return newPaths;
            });
            onSignatureChange?.(true);
            currentPathRef.current = "";
            setCurrentDrawing("");
          }
        },
        onPanResponderTerminate: () => {
          if (currentPathRef.current) {
            const finishedPath = currentPathRef.current;
            setPaths((prev) => {
              const newPaths = [...prev, finishedPath];
              pathsRef.current = newPaths;
              return newPaths;
            });
            onSignatureChange?.(true);
            currentPathRef.current = "";
            setCurrentDrawing("");
          }
        },
      })
    ).current;

    const handleLayout = useCallback(() => {
      if (containerRef.current) {
        containerRef.current.measureInWindow((x, y, w, h) => {
          if (typeof x === "number" && typeof y === "number") {
            layoutRef.current = { x, y, width: w || width, height: h || height };
          }
        });
      }
    }, [width, height]);

    return (
      <View
        ref={containerRef}
        onLayout={handleLayout}
        style={[
          styles.container,
          {
            width,
            height,
            backgroundColor,
            borderColor,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          {paths.map((d, i) => (
            <Path
              key={i}
              d={d}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {currentDrawing ? (
            <Path
              d={currentDrawing}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </Svg>
      </View>
    );
  }
);

// Static ref for backward compatibility with parent component access
(SignaturePad as any)._ref = null as SignaturePadRef | null;

const styles = StyleSheet.create({
  container: {
    borderWidth: 1.5,
    borderRadius: 12,
    overflow: "hidden",
    borderStyle: "dashed",
  },
});
