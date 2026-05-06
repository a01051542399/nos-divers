/**
 * 네이티브(iOS/Android) 빌드에서만 실행되는 초기화 코드.
 *
 * StatusBar.setOverlaysWebView(true) 를 명시적으로 호출하여
 * WebView 가 시스템 UI(상태바/내비바) 영역까지 확장되도록 보장.
 * 이 후 CSS 의 env(safe-area-inset-*) 가 정상 값을 반환한다.
 */

import { isNative } from "./platform";

export async function initNative(): Promise<void> {
  if (!isNative()) return;

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");

    // WebView 가 상태바 영역까지 그리도록
    await StatusBar.setOverlaysWebView({ overlay: true });

    // 다크/라이트 시스템 테마 추종은 추후 확장 가능
    await StatusBar.setStyle({ style: Style.Default });
  } catch (e) {
    console.warn("StatusBar init 실패:", e);
  }
}
