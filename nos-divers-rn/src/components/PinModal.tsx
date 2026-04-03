import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface PinModalProps {
  visible: boolean;
  title?: string;
  onSubmit: (pin: string) => void;
  onCancel: () => void;
  error?: string;
}

export default function PinModal({
  visible,
  title = 'PIN 입력',
  onSubmit,
  onCancel,
  error,
}: PinModalProps) {
  const [pin, setPin] = useState('');
  const inputRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // 모달 열릴 때 PIN 초기화 및 자동 포커스
  useEffect(() => {
    if (visible) {
      setPin('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [visible]);

  // 에러 발생 시 흔들기 애니메이션 + PIN 초기화
  useEffect(() => {
    if (error) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start(() => {
        setPin('');
        setTimeout(() => {
          inputRef.current?.focus();
        }, 50);
      });
    }
  }, [error, shakeAnim]);

  const handleChangeText = (text: string) => {
    // 숫자만 허용, 최대 4자리
    const numeric = text.replace(/[^0-9]/g, '').slice(0, 4);
    setPin(numeric);

    // 4자리 완성 시 자동 제출
    if (numeric.length === 4) {
      onSubmit(numeric);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}
        >
          {/* 제목 */}
          <Text style={styles.title}>{title}</Text>

          {/* PIN 도트 표시 */}
          <View style={styles.dotsContainer}>
            {[0, 1, 2, 3].map((index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index < pin.length ? styles.dotFilled : styles.dotEmpty,
                ]}
              />
            ))}
          </View>

          {/* 숨김 TextInput (키패드 트리거) */}
          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={pin}
            onChangeText={handleChangeText}
            keyboardType="number-pad"
            maxLength={4}
            caretHidden
            autoFocus={false}
          />

          {/* 에러 메시지 */}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* 취소 버튼 */}
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelText}>취소</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 30,
    width: 280,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#023E58',
    marginBottom: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  dotFilled: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  dotEmpty: {
    backgroundColor: '#ffffff',
    borderColor: '#cccccc',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  errorText: {
    color: '#e53935',
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 32,
  },
  cancelText: {
    fontSize: 15,
    color: '#666666',
  },
});
