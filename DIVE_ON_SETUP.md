# Dive ON 분리 운영 셋업 가이드

NoS Divers 와는 완전히 별개로 운영되는 Dive ON 동호회 정산 앱의 초기 셋업 절차.

## ✅ 코드에서 이미 적용된 것

| 항목 | 값 |
|------|-----|
| 앱 이름 | Dive ON |
| iOS Bundle ID / Android applicationId | `com.diveon.app` |
| URL Scheme (딥링크) | `com.diveon.app://callback` |
| Capacitor `appId` / `appName` | `com.diveon.app` / `Dive ON` |
| 로고 (라이트/다크) | `흰색로고.png` / `검정로고.png` 자동 생성 |

## ⚠️ 외부 자원 신규 생성 (사용자 작업)

### 1. Supabase 새 프로젝트
1. https://supabase.com/dashboard → **New project**
   - Name: `dive-on` (자유)
   - Region: `Northeast Asia (Seoul)`
2. 생성 후 **Settings → API** 에서 두 값을 복사
3. 로컬에서 `nos-divers-web/.env.local` 의 `YOUR-NEW-PROJECT` 부분 교체
4. **SQL Editor** 에서 순서대로 실행:
   ```
   src/lib/schema.sql                       (테이블/RLS/RPC 전체)
   src/lib/migration-security.sql           (관리자 비밀번호 해시 + Storage RLS + N+1 RPC)
   src/lib/migration-announcements.sql      (공지 시스템)
   src/lib/migration-push-notifications.sql (push 토큰 테이블)
   ```
5. 관리자 비밀번호 확인:
   ```sql
   SELECT verify_admin_password('950506');  -- TRUE
   ```
6. **Storage** 버킷 `images` 생성 여부 확인 (schema.sql 이 자동 생성).

### 2. Kakao OAuth 새 앱
1. https://developers.kakao.com → **내 애플리케이션 → 애플리케이션 추가**
   - 앱 이름: `Dive ON`
2. **앱 키** → REST API 키 복사
3. **카카오 로그인 → 활성화 ON**
4. **Redirect URI** 등록:
   - `https://YOUR-NEW-PROJECT.supabase.co/auth/v1/callback`
5. Supabase Dashboard → **Authentication → Providers → Kakao** 활성화 + 위 키 입력

### 3. Google OAuth 새 클라이언트
1. https://console.cloud.google.com → 새 프로젝트 (또는 기존 프로젝트)
2. **APIs & Services → Credentials → Create OAuth client ID**
   - Application type: Web application
3. **Authorized redirect URIs**:
   - `https://YOUR-NEW-PROJECT.supabase.co/auth/v1/callback`
4. Supabase Dashboard → **Authentication → Providers → Google** 활성화 + 클라이언트 ID/Secret 입력

### 4. iOS — App Store Connect 신규 앱 등록
1. https://appstoreconnect.apple.com → **My Apps → +**
   - Name: `Dive ON`
   - Bundle ID: `com.diveon.app` (등록되어 있어야 함 — Apple Developer Portal 에서 먼저 등록)
   - SKU: `dive-on`
2. **Apple Developer Portal** → Identifiers → 새 App ID `com.diveon.app` 등록
3. App Store Connect 에서 새로 생성된 App 의 **App ID 숫자** 확인 (URL 참조)
4. 다음 파일에서 `REPLACE_WITH_NEW_APP_ID` 부분을 새 App ID 로 교체:
   - `codemagic.yaml`
   - `nos-divers-web/codemagic.yaml`
5. Codemagic Dashboard → 새 App 추가 → 본 저장소 연결
6. `codemagic.yaml` 의 `# triggering:` 주석 해제하여 자동 빌드 활성화

### 5. Android — Play Console 신규 앱 등록
1. https://play.google.com/console → **앱 만들기**
   - 이름: `Dive ON`
   - 패키지 이름: `com.diveon.app`
2. 새 keystore 생성 (또는 기존 keystore 재사용 가능, 단 패키지명 다르므로 별도 권장)
3. `nos-divers-web/android/keystore.properties` 신규 작성 (gitignored)
4. `versionCode 1` 부터 시작 (이미 적용됨)

### 6. Codemagic Secrets / Integrations
- App Store Connect API Key (Issuer ID, Key ID, Private Key) — 새로 발급 가능
- 기존 NoS Divers Codemagic 워크플로와 분리 (별도 App 으로 관리)

## 빌드 검증

```bash
cd nos-divers-web
npm ci
npm run build              # TypeScript + Vite 빌드
npx cap sync ios           # SPM 의존성 + 식별자 sync
npx cap sync android       # Android 식별자 sync
npx cap open ios           # Xcode 열기 (Bundle ID com.diveon.app 확인)
npx cap open android       # Android Studio (applicationId com.diveon.app 확인)
```

## 데이터 마이그레이션 (선택)

기존 NoS Divers 사용자 데이터를 Dive ON 으로 이전하려면:
- Supabase Dashboard → Table Editor → CSV Export (NoS) → Import (Dive ON)
- 단, `auth.users` 는 직접 이전 불가 → 사용자 재가입 필요
- 또는 그냥 새 출발 (권장 — 별개 운영 취지에 부합)

## 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| 로그인 후 빈 화면 | `.env.local` 미설정 | 새 Supabase URL/Key 입력 후 dev 서버 재시작 |
| OAuth 콜백 실패 | Provider redirect URI 오기재 | `https://NEW.supabase.co/auth/v1/callback` 정확히 입력 |
| 딥링크 동작 안함 (앱) | 새 Bundle ID 등록 누락 | Apple Developer / Play Console 에서 식별자 등록 확인 |
| Codemagic 빌드 실패 (App ID 못 찾음) | `APP_STORE_CONNECT_APP_ID` 미교체 | App Store Connect 에서 숫자 ID 확인 후 yaml 교체 |
