import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Platform,
  PanResponder,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface SignatureModalProps {
  visible: boolean;
  onSave: (signatureBase64: string) => void;
  onCancel: () => void;
  signerName: string;
  strokeColor?: string;
  backgroundColor?: string;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export function SignatureModal({
  visible,
  onSave,
  onCancel,
  signerName,
  strokeColor = "#1A1A2E",
  backgroundColor = "#FFFFFF",
}: SignatureModalProps) {
  const insets = useSafeAreaInsets();
  const [paths, setPaths] = useState<string[]>([]);
  const [currentDrawing, setCurrentDrawing] = useState<string>("");
  const currentPathRef = useRef<string>("");
  const pathsRef = useRef<string[]>([]);
  const containerRef = useRef<View>(null);
  const layoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // Canvas dimensions - full width with padding
  const canvasWidth = SCREEN_WIDTH - 32;
  const canvasHeight = Math.min(SCREEN_HEIGHT * 0.45, 320);

  useEffect(() => {
    pathsRef.current = paths;
  }, [paths]);

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      setPaths([]);
      setCurrentDrawing("");
      currentPathRef.current = "";
      pathsRef.current = [];
    }
  }, [visible]);

  const hasSignature = paths.length > 0;

  const getLocationInView = useCallback(
    (pageX: number, pageY: number): { x: number; y: number } => {
      const layout = layoutRef.current;
      const x = Math.max(0, Math.min(pageX - layout.x, canvasWidth));
      const y = Math.max(0, Math.min(pageY - layout.y, canvasHeight));
      return { x, y };
    },
    [canvasWidth, canvasHeight]
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
          layoutRef.current = { x, y, width: w || canvasWidth, height: h || canvasHeight };
        }
      });
    }
  }, [canvasWidth, canvasHeight]);

  const handleClear = () => {
    setPaths([]);
    setCurrentDrawing("");
    currentPathRef.current = "";
    pathsRef.current = [];
  };

  const handleSave = () => {
    if (pathsRef.current.length === 0) return;
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}"><rect width="${canvasWidth}" height="${canvasHeight}" fill="${backgroundColor}"/>${pathsRef.current.map((d) => `<path d="${d}" stroke="${strokeColor}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join("")}</svg>`;
    try {
      let base64: string;
      if (typeof btoa !== "undefined") {
        base64 = btoa(unescape(encodeURIComponent(svgContent)));
      } else {
        base64 = Buffer.from(svgContent).toString("base64");
      }
      onSave(`data:image/svg+xml;base64,${base64}`);
    } catch {
      try {
        const base64 = typeof btoa !== "undefined"
          ? btoa(svgContent)
          : Buffer.from(svgContent).toString("base64");
        onSave(`data:image/svg+xml;base64,${base64}`);
      } catch {
        // fallback: pass raw SVG
        onSave(svgContent);
      }
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <View style={[styles.container, { backgroundColor: "#F8F9FA" }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            { paddingTop: Math.max(insets.top, 16) + 8 },
          ]}
        >
          <TouchableOpacity
            onPress={onCancel}
            style={styles.headerBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelText}>취소</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>서명</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={[
              styles.headerBtn,
              styles.saveBtn,
              !hasSignature && styles.saveBtnDisabled,
            ]}
            activeOpacity={hasSignature ? 0.7 : 1}
            disabled={!hasSignature}
          >
            <Text
              style={[
                styles.saveText,
                !hasSignature && styles.saveTextDisabled,
              ]}
            >
              저장
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            아래 영역에 손가락으로 서명해 주세요
          </Text>
          <Text style={styles.signerText}>
            서명자: {signerName} | {new Date().toLocaleDateString("ko-KR")}
          </Text>
        </View>

        {/* Canvas */}
        <View style={styles.canvasWrapper}>
          <View
            ref={containerRef}
            onLayout={handleLayout}
            style={[
              styles.canvas,
              {
                width: canvasWidth,
                height: canvasHeight,
                backgroundColor,
              },
            ]}
            {...panResponder.panHandlers}
          >
            <Svg
              width={canvasWidth}
              height={canvasHeight}
              viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
            >
              {paths.map((d, i) => (
                <Path
                  key={i}
                  d={d}
                  stroke={strokeColor}
                  strokeWidth={2.5}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {currentDrawing ? (
                <Path
                  d={currentDrawing}
                  stroke={strokeColor}
                  strokeWidth={2.5}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
            </Svg>

            {/* Placeholder text when empty */}
            {!hasSignature && !currentDrawing && (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderText}>여기에 서명하세요</Text>
              </View>
            )}
          </View>
        </View>

        {/* Clear button */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={handleClear}
            style={[styles.clearBtn, !hasSignature && { opacity: 0.4 }]}
            activeOpacity={0.7}
            disabled={!hasSignature}
          >
            <IconSymbol name="trash.fill" size={18} color="#FF3B30" />
            <Text style={styles.clearText}>지우기</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom hint */}
        <View style={[styles.bottomHint, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Text style={styles.hintText}>
            서명 후 "저장" 버튼을 눌러주세요
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  headerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A2E",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#007AFF",
  },
  saveBtn: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  saveBtnDisabled: {
    backgroundColor: "#D1D5DB",
  },
  saveText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  saveTextDisabled: {
    color: "#9CA3AF",
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    alignItems: "center",
    gap: 4,
  },
  infoText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },
  signerText: {
    fontSize: 13,
    color: "#6B7280",
  },
  canvasWrapper: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  canvas: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    overflow: "hidden",
    position: "relative",
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "none",
  },
  placeholderText: {
    fontSize: 18,
    color: "#D1D5DB",
    fontWeight: "500",
  },
  actionRow: {
    alignItems: "center",
    paddingTop: 16,
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: "#FEE2E2",
  },
  clearText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF3B30",
  },
  bottomHint: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 32,
  },
  hintText: {
    fontSize: 13,
    color: "#9CA3AF",
  },
});
