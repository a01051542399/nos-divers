# React Native Feature Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the React Native app to full feature parity with the original Capacitor web app — all 32 identified gaps.

**Architecture:** The RN app (nos-divers-rn) uses Expo 54 + React Navigation + Supabase. We add missing screens, components, and utilities while maintaining the existing light-blue theme (#E8F4F8) for most screens and dark theme (#0D1117) for TourDetail. All new code goes into the existing `src/` structure.

**Tech Stack:** React Native 0.81, Expo 54, TypeScript 5.9, Supabase, react-native-svg (signatures), expo-print (PDF), xlsx (Excel), react-native-toast-message (toasts), @react-native-async-storage/async-storage (theme persistence)

---

## File Structure

### New Files to Create:
```
src/components/PinModal.tsx          — 4-digit PIN input modal
src/components/Toast.tsx             — Toast notification provider + hook
src/components/ThemeContext.tsx       — Theme state (light/dark/system) + provider
src/screens/SignupScreen.tsx         — Registration with optional profile fields
src/screens/PasswordResetScreen.tsx  — Email-based password recovery
src/screens/WaiverViewScreen.tsx     — Signed waiver detail + delete
src/screens/AdminDashboardScreen.tsx — Admin: stats/tours/waivers/backup tabs
src/screens/SettingsGuideScreen.tsx  — 11-section user manual
src/screens/HiddenToursScreen.tsx    — Hidden tours list + restore
src/screens/TrashScreen.tsx          — Deleted tours list + restore/permanent delete
src/utils/export-pdf.ts             — Settlement PDF via expo-print
src/utils/export-excel.ts           — 3-sheet XLSX export
src/utils/export-waiver-pdf.ts      — Waiver PDF (single + bulk)
```

### Files to Modify:
```
App.tsx                              — Add new screens to navigators, wrap with Toast+Theme providers
src/screens/LoginScreen.tsx          — Add signup/reset navigation, fix OAuth button icons
src/screens/TourDetailScreen.tsx     — Add expense edit/delete with PIN, fix comment author, add export buttons, improve expense detail, add waiver status indicator
src/screens/TourListScreen.tsx       — Add tour edit/delete with PIN, hide tour, add tab icons
src/screens/WaiverSignScreen.tsx     — Replace text signature with canvas drawing
src/screens/WaiversScreen.tsx        — Add navigation to WaiverViewScreen
src/screens/SettingsScreen.tsx       — Wire up all placeholder items (password, theme, admin, hidden, trash, guide)
src/screens/ProfileScreen.tsx        — Add password protection for edit
src/screens/AddExpenseScreen.tsx     — Add edit mode support
src/lib/AuthContext.tsx              — Add signUp, resetPassword methods
package.json                         — Add new dependencies
```

---

## Phase 1: Foundation (Tasks 1-3)

### Task 1: Install Dependencies

**Files:**
- Modify: `nos-divers-rn/package.json`

- [ ] **Step 1: Install new packages**

```bash
cd nos-divers-rn
npx expo install react-native-svg react-native-gesture-handler expo-print expo-sharing react-native-toast-message
npm install xlsx react-native-reanimated
```

- [ ] **Step 2: Verify installation**

```bash
npx expo doctor
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: RN feature parity 의존성 추가"
```

---

### Task 2: Toast Notification System

**Files:**
- Create: `nos-divers-rn/src/components/Toast.tsx`
- Modify: `nos-divers-rn/App.tsx`

- [ ] **Step 1: Create Toast component and hook**

Create `src/components/Toast.tsx`:

```tsx
import React, { createContext, useContext, useCallback, useRef, useState } from 'react';
import { Animated, Text, StyleSheet, Modal, View, TouchableOpacity } from 'react-native';

type ToastType = 'info' | 'success' | 'error' | 'warning';

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  confirm: (message: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType>({
  toast: () => {},
  confirm: () => Promise.resolve(false),
});

export const useToast = () => useContext(ToastContext);

const COLORS: Record<ToastType, string> = {
  info: '#2196F3',
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('info');
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // confirm dialog state
  const [confirmMsg, setConfirmMsg] = useState('');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const confirmResolve = useRef<(v: boolean) => void>();

  const toast = useCallback((msg: string, t: ToastType = 'info') => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(msg);
    setType(t);
    setVisible(true);
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setVisible(false));
    }, 2500);
  }, [opacity]);

  const confirm = useCallback((msg: string): Promise<boolean> => {
    setConfirmMsg(msg);
    setConfirmVisible(true);
    return new Promise((resolve) => { confirmResolve.current = resolve; });
  }, []);

  const handleConfirm = (result: boolean) => {
    setConfirmVisible(false);
    confirmResolve.current?.(result);
  };

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}
      {visible && (
        <Animated.View style={[styles.toast, { opacity, borderLeftColor: COLORS[type] }]}>
          <Text style={styles.toastText}>{message}</Text>
        </Animated.View>
      )}
      <Modal visible={confirmVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <Text style={styles.dialogText}>{confirmMsg}</Text>
            <View style={styles.dialogButtons}>
              <TouchableOpacity style={styles.dialogCancel} onPress={() => handleConfirm(false)}>
                <Text style={styles.dialogCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dialogOk} onPress={() => handleConfirm(true)}>
                <Text style={styles.dialogOkText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute', top: 60, left: 20, right: 20,
    backgroundColor: '#fff', borderRadius: 8, padding: 14,
    borderLeftWidth: 4, elevation: 6, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4,
    zIndex: 9999,
  },
  toastText: { fontSize: 14, color: '#333' },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  dialog: {
    backgroundColor: '#fff', borderRadius: 12, padding: 24, width: 300,
  },
  dialogText: { fontSize: 16, color: '#333', textAlign: 'center', marginBottom: 20 },
  dialogButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  dialogCancel: {
    flex: 1, marginRight: 8, padding: 12, borderRadius: 8,
    backgroundColor: '#F1F5F9', alignItems: 'center',
  },
  dialogOk: {
    flex: 1, marginLeft: 8, padding: 12, borderRadius: 8,
    backgroundColor: '#2196F3', alignItems: 'center',
  },
  dialogCancelText: { color: '#666', fontSize: 15, fontWeight: '600' },
  dialogOkText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
```

- [ ] **Step 2: Wrap App with ToastProvider**

In `App.tsx`, import ToastProvider and wrap the app:

```tsx
import { ToastProvider } from './src/components/Toast';

// In AppContent or top-level return:
// Wrap <SafeAreaProvider> children with <ToastProvider>
```

Add `<ToastProvider>` wrapping the navigation container inside `AppContent`.

- [ ] **Step 3: Verify toast works**

Add a temporary `useToast()` call in any screen and test via Expo Go.

- [ ] **Step 4: Commit**

```bash
git add src/components/Toast.tsx App.tsx
git commit -m "feat: 토스트 알림 + 확인 다이얼로그 시스템 추가"
```

---

### Task 3: PIN Modal Component

**Files:**
- Create: `nos-divers-rn/src/components/PinModal.tsx`

- [ ] **Step 1: Create PinModal**

Create `src/components/PinModal.tsx`:

```tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, Animated, Keyboard,
} from 'react-native';

interface PinModalProps {
  visible: boolean;
  title?: string;
  onSubmit: (pin: string) => void;
  onCancel: () => void;
  error?: string;
}

export default function PinModal({ visible, title = 'PIN 입력', onSubmit, onCancel, error }: PinModalProps) {
  const [pin, setPin] = useState('');
  const inputRef = useRef<TextInput>(null);
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setPin('');
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [visible]);

  useEffect(() => {
    if (error) {
      Animated.sequence([
        Animated.timing(shake, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
      setPin('');
    }
  }, [error, shake]);

  const handleChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 4);
    setPin(digits);
    if (digits.length === 4) {
      Keyboard.dismiss();
      onSubmit(digits);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.overlay}>
        <Animated.View style={[s.card, { transform: [{ translateX: shake }] }]}>
          <Text style={s.title}>{title}</Text>
          <View style={s.dots}>
            {[0, 1, 2, 3].map(i => (
              <View key={i} style={[s.dot, i < pin.length && s.dotFilled]} />
            ))}
          </View>
          <TextInput
            ref={inputRef}
            style={s.hiddenInput}
            value={pin}
            onChangeText={handleChange}
            keyboardType="number-pad"
            maxLength={4}
            autoFocus
          />
          {error ? <Text style={s.error}>{error}</Text> : null}
          <TouchableOpacity style={s.cancel} onPress={onCancel}>
            <Text style={s.cancelText}>취소</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 30,
    width: 280, alignItems: 'center',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#023E58', marginBottom: 24 },
  dots: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  dot: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2, borderColor: '#ccc', backgroundColor: '#fff',
  },
  dotFilled: { backgroundColor: '#2196F3', borderColor: '#2196F3' },
  hiddenInput: { position: 'absolute', opacity: 0, height: 0, width: 0 },
  error: { color: '#F44336', fontSize: 13, marginBottom: 12 },
  cancel: { marginTop: 8, padding: 10 },
  cancelText: { color: '#999', fontSize: 15 },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PinModal.tsx
git commit -m "feat: PIN 입력 모달 컴포넌트 추가"
```

---

## Phase 2: Auth (Tasks 4-5)

### Task 4: Add Signup & Password Reset to AuthContext

**Files:**
- Modify: `nos-divers-rn/src/lib/AuthContext.tsx`

- [ ] **Step 1: Add signUp and resetPassword to AuthContext**

Add to the AuthState interface and AuthProvider:

```tsx
// Add to AuthState interface:
signUpWithEmail: (email: string, password: string, name: string) => Promise<string | null>;
resetPassword: (email: string) => Promise<string | null>;

// Add to AuthProvider:
const signUpWithEmail = useCallback(async (email: string, password: string, name: string) => {
  const { error } = await supabase.auth.signUp({
    email, password,
    options: { data: { full_name: name } },
  });
  if (error) return error.message;
  return null;
}, []);

const resetPassword = useCallback(async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) return error.message;
  return null;
}, []);
```

Update the context value to include these two new methods. Update default context values with no-op implementations.

- [ ] **Step 2: Commit**

```bash
git add src/lib/AuthContext.tsx
git commit -m "feat: AuthContext에 회원가입/비밀번호 재설정 추가"
```

---

### Task 5: Signup & Password Reset Screens

**Files:**
- Create: `nos-divers-rn/src/screens/SignupScreen.tsx`
- Create: `nos-divers-rn/src/screens/PasswordResetScreen.tsx`
- Modify: `nos-divers-rn/src/screens/LoginScreen.tsx`
- Modify: `nos-divers-rn/App.tsx`

- [ ] **Step 1: Create SignupScreen**

Create `src/screens/SignupScreen.tsx` with:
- Fields: name (required), email, password, confirmPassword
- Optional fields: phone (formatted XXX-XXXX-XXXX), birthDate (YYYY-MM-DD), divingLevel, emergencyContact
- Validation: passwords match, name not empty, email valid
- On success: show "가입 완료" alert, navigate back to login
- Style: same light-blue theme as LoginScreen

- [ ] **Step 2: Create PasswordResetScreen**

Create `src/screens/PasswordResetScreen.tsx` with:
- Single email input
- "비밀번호 재설정 링크 전송" button
- On success: show info message + navigate back
- Style: same theme

- [ ] **Step 3: Update LoginScreen with navigation links**

In `LoginScreen.tsx`:
- Add "회원가입" text button below login form → navigates to Signup
- Add "비밀번호를 잊으셨나요?" link → navigates to PasswordReset
- Replace 💬 emoji with styled "카카오" text badge (yellow bg)
- Replace "G" text with styled "Google" text badge (white bg, border)

- [ ] **Step 4: Add screens to App.tsx navigator**

In `App.tsx`, add to the root navigator (outside tabs, before auth gate):
- SignupScreen
- PasswordResetScreen

- [ ] **Step 5: Commit**

```bash
git add src/screens/SignupScreen.tsx src/screens/PasswordResetScreen.tsx src/screens/LoginScreen.tsx App.tsx
git commit -m "feat: 회원가입 + 비밀번호 재설정 화면 추가"
```

---

## Phase 3: Theme System (Task 6)

### Task 6: Theme Context + Settings Toggle

**Files:**
- Create: `nos-divers-rn/src/components/ThemeContext.tsx`
- Modify: `nos-divers-rn/App.tsx`
- Modify: `nos-divers-rn/src/screens/SettingsScreen.tsx`

- [ ] **Step 1: Create ThemeContext**

Create `src/components/ThemeContext.tsx`:

```tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  theme: ResolvedTheme;
  setMode: (m: ThemeMode) => void;
  colors: typeof lightColors;
}

const lightColors = {
  bg: '#E8F4F8', surface: '#FFFFFF', text: '#023E58',
  muted: '#3D7A94', border: '#D1E6ED', primary: '#2196F3',
  error: '#F44336', success: '#4CAF50', warning: '#FF9800',
  card: '#FFFFFF', inputBg: '#F8FBFC',
};

const darkColors = {
  bg: '#0D1117', surface: '#161B22', text: '#E6EDF3',
  muted: '#8B949E', border: '#30363D', primary: '#58A6FF',
  error: '#F85149', success: '#3FB950', warning: '#D29922',
  card: '#161B22', inputBg: '#0D1117',
};

const ThemeContext = createContext<ThemeContextType>({
  mode: 'system', theme: 'light', setMode: () => {},
  colors: lightColors,
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem('nos_divers_theme').then(v => {
      if (v === 'light' || v === 'dark' || v === 'system') setModeState(v);
    });
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem('nos_divers_theme', m);
  }, []);

  const resolved: ResolvedTheme = mode === 'system'
    ? (systemScheme === 'dark' ? 'dark' : 'light')
    : mode;

  const colors = resolved === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ mode, theme: resolved, setMode, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

- [ ] **Step 2: Wrap App with ThemeProvider in App.tsx**

Add `<ThemeProvider>` wrapping `<ToastProvider>` in App.tsx.

- [ ] **Step 3: Add theme toggle in SettingsScreen**

Replace the "화면 모드" placeholder row with a working toggle that cycles light/dark/system using `useTheme()`.

- [ ] **Step 4: Commit**

```bash
git add src/components/ThemeContext.tsx App.tsx src/screens/SettingsScreen.tsx
git commit -m "feat: 라이트/다크/시스템 테마 전환 구현"
```

---

## Phase 4: Tour Management (Tasks 7-9)

### Task 7: Tour Edit/Delete with PIN

**Files:**
- Modify: `nos-divers-rn/src/screens/TourListScreen.tsx`
- Modify: `nos-divers-rn/src/screens/TourDetailScreen.tsx`

- [ ] **Step 1: Add tour actions in TourListScreen**

Add long-press or action menu on tour cards with options:
- "수정" → PIN modal → edit form (name, date, location)
- "삭제" → PIN modal → confirm → soft delete
- "숨기기" → hide tour (update hiddenTourIds in app_settings)

Import and use `PinModal` and `useToast`.

- [ ] **Step 2: Add tour edit/delete in TourDetailScreen header**

Add a "..." (more) button in the TourDetail header that opens an action sheet with:
- Edit tour info
- Delete tour
Both require PIN verification via PinModal.

- [ ] **Step 3: Commit**

```bash
git add src/screens/TourListScreen.tsx src/screens/TourDetailScreen.tsx
git commit -m "feat: 투어 수정/삭제/숨기기 + PIN 인증 추가"
```

---

### Task 8: Hidden Tours Screen

**Files:**
- Create: `nos-divers-rn/src/screens/HiddenToursScreen.tsx`
- Modify: `nos-divers-rn/src/screens/SettingsScreen.tsx`
- Modify: `nos-divers-rn/App.tsx`

- [ ] **Step 1: Create HiddenToursScreen**

Screen showing all hidden tours (from app_settings.hiddenTourIds). Each row has a "복원" button to un-hide the tour. Uses `useAppSettings` hook + `setHiddenTourIds`.

- [ ] **Step 2: Wire up from SettingsScreen**

Add "숨긴 투어" row that navigates to HiddenToursScreen. Show count badge.

- [ ] **Step 3: Add to navigator in App.tsx**

Add HiddenToursScreen to SettingsStack.

- [ ] **Step 4: Commit**

```bash
git add src/screens/HiddenToursScreen.tsx src/screens/SettingsScreen.tsx App.tsx
git commit -m "feat: 숨긴 투어 관리 화면 추가"
```

---

### Task 9: Trash (Deleted Tours) Screen

**Files:**
- Create: `nos-divers-rn/src/screens/TrashScreen.tsx`
- Modify: `nos-divers-rn/src/screens/SettingsScreen.tsx`
- Modify: `nos-divers-rn/App.tsx`

- [ ] **Step 1: Create TrashScreen**

Screen showing soft-deleted tours (useTrashTours hook). Each card shows:
- Tour name, date, location
- Days remaining before permanent deletion (7 - daysSinceDelete)
- "복원" button → calls restoreTour()
- "영구 삭제" button → confirm → calls deleteTour()

- [ ] **Step 2: Wire up from SettingsScreen**

Add "임시보관함" row navigating to TrashScreen. Show count.

- [ ] **Step 3: Add to navigator + auto-cleanup**

Add TrashScreen to SettingsStack. Call `cleanupTrash()` on app startup in App.tsx.

- [ ] **Step 4: Commit**

```bash
git add src/screens/TrashScreen.tsx src/screens/SettingsScreen.tsx App.tsx
git commit -m "feat: 임시보관함 (휴지통) 화면 + 7일 자동삭제"
```

---

## Phase 5: Expense Management (Tasks 10-11)

### Task 10: Expense Edit/Delete with PIN in TourDetail

**Files:**
- Modify: `nos-divers-rn/src/screens/TourDetailScreen.tsx`
- Modify: `nos-divers-rn/src/screens/AddExpenseScreen.tsx`

- [ ] **Step 1: Add expense card actions**

In TourDetailScreen expenses tab, add touch handler on each expense card:
- Long press or swipe to reveal "수정" / "삭제" buttons
- Both trigger PinModal for verification
- "수정" → navigate to AddExpenseScreen with existing expense data as params
- "삭제" → confirm + PIN → call removeExpense()

- [ ] **Step 2: Add edit mode to AddExpenseScreen**

Modify AddExpenseScreen to accept optional `expense` route param:
- If expense param exists: pre-fill all fields, change title to "비용 수정", call editExpense on save
- If no param: existing create behavior

- [ ] **Step 3: Add expandable expense detail**

Enhance expense cards in TourDetail to be expandable on tap:
- Show paidBy name, split participants, receipt image thumbnail
- Currency + exchange rate info
- Creation date

- [ ] **Step 4: Commit**

```bash
git add src/screens/TourDetailScreen.tsx src/screens/AddExpenseScreen.tsx
git commit -m "feat: 비용 수정/삭제 + PIN 인증 + 상세 보기"
```

---

### Task 11: Fix Comment Author + Waiver Status in TourDetail

**Files:**
- Modify: `nos-divers-rn/src/screens/TourDetailScreen.tsx`

- [ ] **Step 1: Fix comment author name**

Replace hardcoded "나" with actual profile name:
- Import and use `useProfile` hook
- Use `profile?.name` as authorName when adding comments
- Show loading state if profile not yet loaded

- [ ] **Step 2: Add waiver status indicator on participants**

In the participants tab, show colored dot next to each participant:
- Green dot = signed waiver
- Red dot = no waiver
- Fetch waivers for this tour using `useWaivers(tourId)`
- Match participant names to waiver signerNames

- [ ] **Step 3: Commit**

```bash
git add src/screens/TourDetailScreen.tsx
git commit -m "fix: 댓글 작성자 실명 사용 + 참여자 동의서 상태 표시"
```

---

## Phase 6: Waiver Features (Tasks 12-14)

### Task 12: Canvas Signature (Replace Text Input)

**Files:**
- Modify: `nos-divers-rn/src/screens/WaiverSignScreen.tsx`

- [ ] **Step 1: Implement SVG-based signature pad**

Replace Step 2's TextInput with a touch-drawing canvas using react-native-svg:

```tsx
import Svg, { Path } from 'react-native-svg';

// Track touch paths as SVG path strings
// onTouchStart → start new path
// onTouchMove → append to current path  
// onTouchEnd → finalize path

// "지우기" button clears all paths
// Convert SVG to base64 PNG using react-native-view-shot or expo's captureRef
```

The signature area should be:
- White background, black stroke
- ~300px height, full width
- Border with rounded corners
- "지우기" (clear) button below

- [ ] **Step 2: Convert signature to base64 PNG for upload**

Use `expo-file-system` or `react-native-view-shot` to capture the SVG view as a PNG base64 string. Replace the 1x1 transparent PNG placeholder.

- [ ] **Step 3: Commit**

```bash
git add src/screens/WaiverSignScreen.tsx
git commit -m "feat: 캔버스 서명 구현 (텍스트 → SVG 드로잉)"
```

---

### Task 13: Waiver View Screen

**Files:**
- Create: `nos-divers-rn/src/screens/WaiverViewScreen.tsx`
- Modify: `nos-divers-rn/src/screens/WaiversScreen.tsx`
- Modify: `nos-divers-rn/App.tsx`

- [ ] **Step 1: Create WaiverViewScreen**

Screen that displays a signed waiver's full details:
- Personal info section: name, birthDate, phone, divingLevel, tourPeriod, tourLocation, emergencyContact
- Health checklist with check marks (green) / x marks (red)
- healthOther text if present
- Signature image (full width, loaded from URL)
- Signed date
- Action buttons: "PDF 내보내기", "삭제"

Parse personalInfo and healthChecklist (may be JSON strings).

- [ ] **Step 2: Add navigation from WaiversScreen**

In WaiversScreen participant list, add "보기" button for signed participants → navigate to WaiverViewScreen with waiver data.

- [ ] **Step 3: Add to navigator**

Add WaiverViewScreen to WaiversStack in App.tsx.

- [ ] **Step 4: Commit**

```bash
git add src/screens/WaiverViewScreen.tsx src/screens/WaiversScreen.tsx App.tsx
git commit -m "feat: 서명된 동의서 상세 보기 화면 추가"
```

---

### Task 14: Waiver PDF Export

**Files:**
- Create: `nos-divers-rn/src/utils/export-waiver-pdf.ts`
- Modify: `nos-divers-rn/src/screens/WaiverViewScreen.tsx`

- [ ] **Step 1: Create export-waiver-pdf.ts**

Use expo-print to generate waiver PDFs:

```tsx
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { WAIVER_TITLE, WAIVER_INTRO, WAIVER_SECTIONS, WAIVER_CLOSING, HEALTH_CHECKLIST } from '../waiver-template';

export async function exportWaiverPDF(waiver: Waiver, tour: Tour) {
  // Build HTML string with:
  // - Title, intro, sections, closing from template
  // - Personal info table
  // - Health checklist with checkmarks
  // - Signature image (<img src="...">)
  // - A4 styling
  const html = buildWaiverHTML(waiver, tour);
  const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
}

export async function exportAllWaiversPDF(waivers: Waiver[], tour: Tour) {
  // Same but with page-break-before for each waiver after the first
  const html = waivers.map((w, i) => buildWaiverHTML(w, tour, i > 0)).join('');
  const { uri } = await Print.printToFileAsync({ html: wrapHTML(html), width: 595, height: 842 });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
}
```

- [ ] **Step 2: Wire export button in WaiverViewScreen**

Connect the "PDF 내보내기" button to call `exportWaiverPDF()`.

- [ ] **Step 3: Commit**

```bash
git add src/utils/export-waiver-pdf.ts src/screens/WaiverViewScreen.tsx
git commit -m "feat: 동의서 PDF 내보내기 (단일 + 일괄)"
```

---

## Phase 7: Settlement Exports (Tasks 15-16)

### Task 15: Settlement PDF Export

**Files:**
- Create: `nos-divers-rn/src/utils/export-pdf.ts`
- Modify: `nos-divers-rn/src/screens/TourDetailScreen.tsx`

- [ ] **Step 1: Create export-pdf.ts**

Use expo-print to generate settlement PDFs with:
- Summary cards: total expenses, item count, transfers count
- O/X matrix: participants as columns, expenses as rows
- Color coding: O=green (#4CAF50), X=red (#F44336), O결제=blue (#2196F3), X결제=orange (#FF9800)
- Per-person summary row: 인당정산액, 결제액, 최종금액
- Settlement transfers list
- Adaptive: landscape if >10 participants

```tsx
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Tour, Settlement } from '../types';
import { formatKRW, calculateSettlement } from '../store';

export async function exportSettlementPDF(tour: Tour, settlements: Settlement[]) {
  const html = buildSettlementHTML(tour, settlements);
  const landscape = tour.participants.length > 10;
  const { uri } = await Print.printToFileAsync({
    html, width: landscape ? 842 : 595, height: landscape ? 595 : 842,
  });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
}
```

- [ ] **Step 2: Add export button to settlement tab**

In TourDetailScreen settlement tab, add "PDF 내보내기" button that calls `exportSettlementPDF()`.

- [ ] **Step 3: Commit**

```bash
git add src/utils/export-pdf.ts src/screens/TourDetailScreen.tsx
git commit -m "feat: 정산 PDF 내보내기 (O/X 매트릭스)"
```

---

### Task 16: Settlement Excel Export

**Files:**
- Create: `nos-divers-rn/src/utils/export-excel.ts`
- Modify: `nos-divers-rn/src/screens/TourDetailScreen.tsx`

- [ ] **Step 1: Create export-excel.ts**

Use xlsx library to generate 3-sheet workbook:

```tsx
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Tour, Settlement } from '../types';
import { formatKRW } from '../store';

export async function exportSettlementExcel(tour: Tour, settlements: Settlement[]) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: 정산 매트릭스
  // Header: 비용명 | 참여자1 | 참여자2 | ...
  // Rows: expense name | O/X per participant
  // Summary rows: 인당정산액, 결제액, 최종금액

  // Sheet 2: 송금 내역
  // Columns: 보내는 사람 | 받는 사람 | 금액

  // Sheet 3: 영수증 목록
  // Columns: 비용명 | 결제자 | 금액 | 영수증 URL

  const path = FileSystem.cacheDirectory + `${tour.name}_정산.xlsx`;
  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  await FileSystem.writeAsStringAsync(path, wbout, { encoding: FileSystem.EncodingType.Base64 });
  await Sharing.shareAsync(path, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
```

- [ ] **Step 2: Add Excel export button to settlement tab**

Add "Excel 내보내기" button next to PDF button in TourDetail settlement tab.

- [ ] **Step 3: Commit**

```bash
git add src/utils/export-excel.ts src/screens/TourDetailScreen.tsx
git commit -m "feat: 정산 Excel 내보내기 (3시트)"
```

---

## Phase 8: Settings & Admin (Tasks 17-21)

### Task 17: Password Change in Settings

**Files:**
- Modify: `nos-divers-rn/src/screens/SettingsScreen.tsx`

- [ ] **Step 1: Implement password change**

Replace "비밀번호 변경" placeholder:
- If no password set: show "비밀번호 설정" → modal with new password + confirm
- If password exists: show "비밀번호 변경" → modal with current + new + confirm
- Use `useAppSettings` hook + `setAccountPassword()` from supabase-store
- Validation: min 4 chars, passwords match

- [ ] **Step 2: Commit**

```bash
git add src/screens/SettingsScreen.tsx
git commit -m "feat: 계정 비밀번호 설정/변경 구현"
```

---

### Task 18: Password-Protected Profile Edit

**Files:**
- Modify: `nos-divers-rn/src/screens/ProfileScreen.tsx`

- [ ] **Step 1: Add password gate for edit mode**

When user taps "편집":
- If accountPassword is set: show PinModal, verify before entering edit mode
- If no password: enter edit mode directly
- Use `useAppSettings` hook to check

- [ ] **Step 2: Commit**

```bash
git add src/screens/ProfileScreen.tsx
git commit -m "feat: 프로필 편집 비밀번호 보호"
```

---

### Task 19: Admin Dashboard

**Files:**
- Create: `nos-divers-rn/src/screens/AdminDashboardScreen.tsx`
- Modify: `nos-divers-rn/src/screens/SettingsScreen.tsx`
- Modify: `nos-divers-rn/App.tsx`

- [ ] **Step 1: Create AdminDashboardScreen**

4-tab admin screen:

**통계 탭:** Show counts from getDataStats() — tourCount, participantCount, expenseCount, waiverCount, commentCount, totalExpenseKRW

**투어 탭:** FlatList of ALL tours (not just user's). Search bar. Each card shows tour info + participant/expense/waiver counts. Edit/delete actions.

**동의서 탭:** Tour filter dropdown → waiver list. Each shows signer, date, personal info summary. Delete action.

**백업 탭:** Show data counts. "로컬 캐시 초기화" button (clears AsyncStorage cache).

- [ ] **Step 2: Wire admin access from SettingsScreen**

"관리자 모드" row → prompts for admin password (verifyAdminPassword RPC) → navigates to AdminDashboardScreen.

- [ ] **Step 3: Add to navigator**

Add AdminDashboardScreen to SettingsStack.

- [ ] **Step 4: Commit**

```bash
git add src/screens/AdminDashboardScreen.tsx src/screens/SettingsScreen.tsx App.tsx
git commit -m "feat: 관리자 대시보드 (통계/투어/동의서/백업)"
```

---

### Task 20: Settings Guide (User Manual)

**Files:**
- Create: `nos-divers-rn/src/screens/SettingsGuideScreen.tsx`
- Modify: `nos-divers-rn/src/screens/SettingsScreen.tsx`
- Modify: `nos-divers-rn/App.tsx`

- [ ] **Step 1: Create SettingsGuideScreen**

ScrollView with 11 collapsible sections:
1. 회원가입 및 로그인
2. 투어 만들기
3. 투어 참여하기
4. 멤버 초대
5. 참여자 관리
6. 비용 입력
7. 정산 확인
8. 면책동의서 서명
9. 댓글 기능
10. 투어 삭제 및 복원
11. 설정

Each section is a TouchableOpacity header that expands/collapses its content.

- [ ] **Step 2: Add "사용설명서" row in SettingsScreen + navigator**

Navigate to SettingsGuideScreen from 정보 section.

- [ ] **Step 3: Commit**

```bash
git add src/screens/SettingsGuideScreen.tsx src/screens/SettingsScreen.tsx App.tsx
git commit -m "feat: 사용설명서 11개 섹션"
```

---

### Task 21: Logout Confirmation Fix

**Files:**
- Modify: `nos-divers-rn/src/screens/SettingsScreen.tsx`

- [ ] **Step 1: Use toast confirm for logout**

Replace Alert.alert with `useToast().confirm()` for logout:

```tsx
const { confirm } = useToast();
const handleSignOut = async () => {
  const ok = await confirm('정말 로그아웃 하시겠습니까?');
  if (ok) signOut();
};
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/SettingsScreen.tsx
git commit -m "refactor: 로그아웃 확인을 토스트 다이얼로그로 교체"
```

---

## Phase 9: UI Polish (Tasks 22-25)

### Task 22: Tab Bar Icons

**Files:**
- Modify: `nos-divers-rn/App.tsx`

- [ ] **Step 1: Add Unicode/emoji icons to tab bar**

Since we don't have an icon library, use simple Unicode characters as tab labels:

```tsx
// In MainTabs tabBarIcon option:
options={{
  tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>📋</Text>,
  // 투어: 📋, 동의서: 📝, 설정: ⚙️
}}
```

Or install `@expo/vector-icons` (included with Expo) and use Ionicons:

```tsx
import { Ionicons } from '@expo/vector-icons';
// 투어: "list", 동의서: "document-text", 설정: "settings"
```

- [ ] **Step 2: Commit**

```bash
git add App.tsx
git commit -m "feat: 탭바 아이콘 추가"
```

---

### Task 23: OAuth Button Styling

**Files:**
- Modify: `nos-divers-rn/src/screens/LoginScreen.tsx`

- [ ] **Step 1: Style OAuth buttons properly**

Replace emoji/text placeholders:
- Kakao: yellow (#FEE500) background, "카카오로 로그인" text with dark (#3C1E1E) color, rounded
- Google: white background with #ddd border, Google "G" in colorful style or just "Google로 로그인"

No external assets needed — styled text buttons matching the original app's look.

- [ ] **Step 2: Commit**

```bash
git add src/screens/LoginScreen.tsx
git commit -m "feat: OAuth 버튼 스타일 개선"
```

---

### Task 24: TourDetail Theme Consistency

**Files:**
- Modify: `nos-divers-rn/src/screens/TourDetailScreen.tsx`

- [ ] **Step 1: Use ThemeContext colors**

Replace hardcoded dark theme (C object) with `useTheme().colors`:
- Import `useTheme` from ThemeContext
- Replace all `C.bg`, `C.card`, etc. references with `colors.bg`, `colors.card`
- This makes TourDetail follow the app-wide theme setting

- [ ] **Step 2: Commit**

```bash
git add src/screens/TourDetailScreen.tsx
git commit -m "refactor: TourDetail 테마 컨텍스트 연동"
```

---

### Task 25: Receipt Image Size Limit + Expense Detail Enhancement

**Files:**
- Modify: `nos-divers-rn/src/screens/AddExpenseScreen.tsx`

- [ ] **Step 1: Add 5MB receipt size limit**

After capturing photo, check base64 size:

```tsx
const sizeInBytes = (base64String.length * 3) / 4;
if (sizeInBytes > 5 * 1024 * 1024) {
  toast('영수증 사진이 5MB를 초과합니다. 다시 촬영해주세요.', 'error');
  return;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/AddExpenseScreen.tsx
git commit -m "feat: 영수증 사진 5MB 제한"
```

---

## Phase 10: Final Integration (Tasks 26-27)

### Task 26: Filter Hidden Tours from TourList

**Files:**
- Modify: `nos-divers-rn/src/screens/TourListScreen.tsx`

- [ ] **Step 1: Filter out hidden tours**

```tsx
const { settings } = useAppSettings();
const visibleTours = tours.filter(t => !settings?.hiddenTourIds?.includes(t.id));
```

Use `visibleTours` in the FlatList instead of `tours`.

- [ ] **Step 2: Commit**

```bash
git add src/screens/TourListScreen.tsx
git commit -m "feat: 숨긴 투어 목록에서 필터링"
```

---

### Task 27: Auto-Cleanup Trash on App Start

**Files:**
- Modify: `nos-divers-rn/App.tsx`

- [ ] **Step 1: Call cleanupTrash on mount**

In AppContent, after auth loads:

```tsx
useEffect(() => {
  if (user) {
    db.cleanupTrash().catch(() => {});
  }
}, [user]);
```

Import cleanupTrash from supabase-store.

- [ ] **Step 2: Final commit**

```bash
git add App.tsx
git commit -m "feat: 앱 시작 시 7일 경과 삭제 투어 자동 정리"
```

---

## Verification Checklist

After all tasks complete, verify in Expo Go:

- [ ] 로그인/가입/비밀번호재설정 흐름
- [ ] 카카오/구글 OAuth 버튼 스타일
- [ ] 투어 생성/참여/수정/삭제 (PIN 인증)
- [ ] 투어 숨기기/복원
- [ ] 임시보관함 (삭제/복원)
- [ ] 비용 추가/수정/삭제 (PIN 인증)
- [ ] 비용 상세 보기 (확장형)
- [ ] 정산 탭 + PDF/Excel 내보내기
- [ ] 캔버스 서명 (터치 드로잉)
- [ ] 동의서 상세 보기
- [ ] 동의서 PDF 내보내기
- [ ] 댓글 작성자 실명
- [ ] 참여자 동의서 상태 (색상 점)
- [ ] 테마 전환 (라이트/다크/시스템)
- [ ] 비밀번호 설정/변경
- [ ] 프로필 편집 비밀번호 보호
- [ ] 관리자 대시보드
- [ ] 사용설명서
- [ ] 토스트 알림
- [ ] 탭바 아이콘
- [ ] 앱 시작 시 휴지통 자동정리
