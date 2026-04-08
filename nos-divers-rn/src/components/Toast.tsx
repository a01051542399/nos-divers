import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "./ThemeContext";

// ─── Types ───────────────────────────────────────────────────────────────────

type ToastType = "info" | "success" | "error" | "warning";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  opacity: Animated.Value;
}

interface ConfirmState {
  visible: boolean;
  message: string;
  resolve: ((value: boolean) => void) | null;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
  confirm: (message: string) => Promise<boolean>;
}

// ─── Colors ──────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<ToastType, string> = {
  info: "#2196F3",
  success: "#4CAF50",
  error: "#F44336",
  warning: "#FF9800",
};

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    visible: false,
    message: "",
    resolve: null,
  });
  const counterRef = useRef(0);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++counterRef.current;
    const opacity = new Animated.Value(0);

    setToasts((prev) => [...prev, { id, message, type, opacity }]);

    // Fade in
    Animated.timing(opacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();

    // Auto-dismiss after 2.5s
    setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      });
    }, 2500);
  }, []);

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ visible: true, message, resolve });
    });
  }, []);

  const handleConfirmClose = useCallback(
    (result: boolean) => {
      if (confirmState.resolve) {
        confirmState.resolve(result);
      }
      setConfirmState({ visible: false, message: "", resolve: null });
    },
    [confirmState]
  );

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Toast Stack */}
      <View style={styles.toastContainer} pointerEvents="none">
        {toasts.map((item) => (
          <Animated.View
            key={item.id}
            style={[
              styles.toastCard,
              { opacity: item.opacity, borderLeftColor: TYPE_COLORS[item.type], backgroundColor: colors.card },
            ]}
          >
            <Text style={[styles.toastText, { color: colors.text }]}>{item.message}</Text>
          </Animated.View>
        ))}
      </View>

      {/* Confirm Dialog */}
      <Modal
        visible={confirmState.visible}
        transparent
        animationType="fade"
        onRequestClose={() => handleConfirmClose(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalMessage, { color: colors.text }]}>{confirmState.message}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => handleConfirmClose(false)}
                activeOpacity={0.75}
              >
                <Text style={styles.cancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: colors.primary }]}
                onPress={() => handleConfirmClose(true)}
                activeOpacity={0.75}
              >
                <Text style={styles.confirmText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Toast
  toastContainer: {
    position: "absolute",
    top: 56,
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
  },
  toastCard: {
    borderRadius: 8,
    borderLeftWidth: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  toastText: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Confirm Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  modalCard: {
    width: "100%",
    borderRadius: 12,
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  modalMessage: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F0F0F0",
  },
  confirmButton: {
    borderRadius: 8,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
  },
  confirmText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});
