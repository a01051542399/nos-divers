import { useState, useEffect, useRef } from "react";
import {
  Text,
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

const ADMIN_PIN = "2399";

interface PinModalProps {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
}

export function PinModal({
  visible,
  onSuccess,
  onCancel,
  title = "관리자 인증",
  message = "삭제하려면 관리자 PIN을 입력하세요",
}: PinModalProps) {
  const colors = useColors();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setPin("");
      setError(false);
      // Auto focus input after modal opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [visible]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handlePinChange = (value: string) => {
    // Only allow numbers, max 4 digits
    const cleaned = value.replace(/[^0-9]/g, "").slice(0, 4);
    setPin(cleaned);
    setError(false);

    // Auto-submit when 4 digits entered
    if (cleaned.length === 4) {
      if (cleaned === ADMIN_PIN) {
        onSuccess();
        setPin("");
      } else {
        setError(true);
        shake();
        // Clear after shake
        setTimeout(() => {
          setPin("");
        }, 500);
      }
    }
  };

  const handleSubmit = () => {
    if (pin === ADMIN_PIN) {
      onSuccess();
      setPin("");
    } else {
      setError(true);
      shake();
      setTimeout(() => {
        setPin("");
      }, 500);
    }
  };

  // Render 4 PIN dots
  const renderPinDots = () => (
    <Animated.View
      style={[styles.dotsContainer, { transform: [{ translateX: shakeAnim }] }]}
    >
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: pin.length > i
                ? (error ? colors.error : colors.primary)
                : "transparent",
              borderColor: error ? colors.error : (pin.length > i ? colors.primary : colors.border),
            },
          ]}
        />
      ))}
    </Animated.View>
  );

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Lock icon */}
          <View style={[styles.lockIcon, { backgroundColor: colors.primary + "15" }]}>
            <IconSymbol name="lock.fill" size={28} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.muted }]}>{message}</Text>

          {/* Hidden text input for keyboard */}
          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={pin}
            onChangeText={handlePinChange}
            keyboardType="number-pad"
            maxLength={4}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            autoFocus={Platform.OS === "web"}
          />

          {/* PIN dots display */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => inputRef.current?.focus()}
          >
            {renderPinDots()}
          </TouchableOpacity>

          {error && (
            <Text style={[styles.errorText, { color: colors.error }]}>
              PIN이 올바르지 않습니다
            </Text>
          )}

          {/* Cancel button */}
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.border }]}
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelText, { color: colors.muted }]}>취소</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  container: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
  },
  lockIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    height: 0,
    width: 0,
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 20,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 12,
  },
  cancelButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginTop: 4,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
