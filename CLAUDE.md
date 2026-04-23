# Dive ON - Project Harness

> **역할**: 너는 Dive ON 앱의 전담 엔지니어다. 앱 기능 개발, 버그 수정, iOS/Android 배포까지 자율적으로 진행하라.
> **PIN**: 2399 (파괴적 작업 시 사용자에게 확인)
> **관리자 비밀번호 (Supabase RPC)**: `950506`
> **NoS Divers (이전)**: 별개 프로젝트 — 본 코드베이스는 완전히 분리 운영
> **분리 운영 셋업 가이드**: `DIVE_ON_SETUP.md`

---

## CRITICAL RULES (절대 위반 금지)

1. **CSS에서 `min-height: 100vh` 사용 금지** - Capacitor WebView에서 레이아웃 깨짐. `height: 100%`만 사용
2. **CocoaPods 사용 금지** - iOS는 SPM(Swift Package Manager) 기반. `.xcworkspace` 없음, `App.xcodeproj` 사용
3. **Codemagic iOS 설정을 건드리지 마라** - API 키, CERTIFICATE_PRIVATE_KEY, code_signing 그룹 동작 확인됨
4. **변경 전 반드시 git commit + push** - 롤백 보장
5. **한국어 UI, 한국어 커밋 메시지** 유지
6. **Supabase RPC 함수 변경 시 기존 클라이언트 호환성 확인** - 앱 업데이트 전 구버전 사용자 존재

---

## PROJECT IDENTITY

| 항목 | 값 |
|------|-----|
| 앱 이름 | Dive ON (다이브온) |
| 용도 | Dive ON 동호회 투어 정산 + 면책동의서 관리 |
| 스택 | Vite 8 + React 19 + TypeScript 5.9 + Capacitor 7.x |
| 백엔드 | Supabase (Auth + PostgreSQL + Storage) — **신규 프로젝트** |
| App ID | `com.diveon.app` |
| App Store ID | (App Store Connect 신규 등록 후 채우기) |
| Deep Link | `com.diveon.app://callback` |
| 로컬 개발 | `localhost:5173` |
| 슬로건 | KEEP CALM AND DIVE ON |

---

## APP ARCHITECTURE

### 라우팅 & 화면 구조 (탭 기반)

```
[투어 탭]
├── TourList.tsx          # 투어 목록 + 생성 (이름, 날짜 YYMMDD, 장소, PIN 4자리)
├── TourDetail.tsx        # 투어 상세 - 3개 탭:
│   ├── 참여자 탭         #   참여자 추가/관리, 동의서 서명 상태(색상), 댓글
│   ├── 비용 탭           #   비용 CRUD, 다중통화(6종+커스텀), 환율자동, 영수증사진, 분배(균등/지정)
│   └── 정산 탭           #   자동 정산 계산, 이체 내역, PDF/Excel 내보내기
└── Join.tsx              # 초대 코드(6자리)로 투어 참여

[동의서 탭]
├── WaiversTab.tsx        # 투어별 동의서 현황 (미서명자 빨간표시)
├── WaiverSign.tsx        # 3단계 마법사: 기본정보 → 건강체크(6항목) → 캔버스 서명
└── WaiverView.tsx        # 서명된 동의서 조회, PDF 단일/일괄 내보내기

[설정 탭]
├── Settings.tsx          # 메인 (프로필, 비밀번호, 테마, 숨긴투어, 임시보관, 관리자접근, 로그아웃)
├── SettingsProfile.tsx   # 개인정보 편집 (이름, 이메일, 직급, 전화, 생년월일, 다이빙레벨, 비상연락처)
├── SettingsDisplay.tsx   # 라이트/다크/시스템 테마
├── SettingsGuide.tsx     # 사용설명서 (11개 섹션)
└── [관리자]
    ├── AdminDashboard.tsx   # 관리자 메인
    ├── AdminStats.tsx       # 통계 (투어/참여자/비용/동의서/댓글 수, 총비용, 최근활동)
    ├── AdminTours.tsx       # 투어 검색/수정/삭제, 동의서 수 조회
    ├── AdminWaivers.tsx     # 투어별 필터, 상세 확인(개인정보/건강/서명), 삭제
    └── AdminBackup.tsx      # 데이터 현황, 로컬 캐시 초기화
```

### 핵심 파일 맵

```
nos-divers-web/
├── src/
│   ├── App.tsx                    # 라우터 + 인증 게이트 + 탭 네비게이션
│   ├── main.tsx                   # React 엔트리
│   ├── index.css                  # WebView CSS (height:100% 필수, safe-area)
│   ├── types.ts                   # 전체 TypeScript 타입 정의
│   ├── store.ts                   # 정산 알고리즘 + 유틸 (formatKRW, formatDate)
│   ├── theme.ts                   # 라이트/다크/시스템 테마 (CSS 변수)
│   ├── toast.tsx                  # 토스트 알림
│   ├── waiver-template.ts         # 면책동의서 양식 텍스트
│   ├── lib/
│   │   ├── AuthContext.tsx         # OAuth 전체 흐름 (카카오/구글/이메일 + 딥링크 + PKCE)
│   │   ├── supabase.ts            # Supabase 클라이언트 초기화
│   │   ├── supabase-store.ts      # Supabase 토큰 저장소 (SecureStore/localStorage)
│   │   ├── platform.ts            # isNative() - Capacitor 네이티브 판별
│   │   ├── push-notifications.ts  # 푸시 알림 (토큰 등록/해제)
│   │   └── migrate-local-data.ts  # 로컬→클라우드 데이터 마이그레이션
│   ├── hooks/
│   │   └── useSupabase.ts         # 모든 데이터 훅 (useTours, useTourDetail, useWaivers, useComments, useProfile, useAppSettings, useTrashTours)
│   ├── components/
│   │   ├── CommentTab.tsx         # 투어 댓글 (본인것만 수정/삭제, 상대시간)
│   │   └── PinModal.tsx           # 4자리 PIN 입력 모달
│   ├── screens/                   # 위 라우팅 참조
│   └── utils/
│       ├── export-excel.ts        # Excel 3시트 (정산매트릭스 + 송금내역 + 영수증)
│       ├── export-pdf.ts          # PDF (참여자요약 + 비용 O/X 매트릭스)
│       ├── export-waiver-pdf.ts   # 면책동의서 PDF (A4, 서명이미지 포함)
│       └── file-save.ts           # 파일 저장 (웹: 다운로드 / 네이티브: Share API)
├── public/oauth-callback.html     # Vercel OAuth 콜백 리다이렉트
├── ios/App/                       # Xcode (SPM, NOT CocoaPods)
│   └── CapApp-SPM/Package.swift   # SPM 의존성
├── android/                       # Android Gradle
└── capacitor.config.ts            # Capacitor 설정 (SplashScreen, PushNotifications)
```

---

## DATA MODEL

### TypeScript 타입 (types.ts)

```typescript
Tour {
  id, name, date, location
  inviteCode (6자리), accessCode (4자리 PIN)
  createdBy (개설자 이름)
  participants: Participant[], expenses: Expense[]
  createdAt, updatedAt, deletedAt (soft delete)
}

Participant { id, tourId, name, addedBy, lastModifiedBy, createdAt }

Expense {
  id, tourId, name, amount, currency, exchangeRate
  paidBy (참여자 ID), splitAmong (참여자 ID[])
  splitType: "equal" | "custom"
  splitAmounts: {[participantId]: amount}  // 커스텀 분배
  receiptImage (base64 data URL)
  lastModifiedBy, createdAt
}

Waiver {
  id, tourId, signerName
  personalInfo: {name, birthDate, phone, divingLevel, tourPeriod, tourLocation, emergencyContact}
  healthChecklist: boolean[] (6개 항목)
  healthOther: string | null
  signatureImage (Supabase Storage URL)
  signedAt, agreed
}

Comment { id, tourId, authorName, text, createdAt, edited }

Settlement { from, to, fromName, toName, amount }  // 정산 결과

UserProfile { name, email, grade, phone, birthDate, divingLevel, emergencyContact }
```

### Supabase DB 테이블

| 테이블 | 주요 컬럼 | 비고 |
|--------|-----------|------|
| `profiles` | id(UUID FK auth.users), name, email, grade, phone, birth_date, diving_level, emergency_contact | 사용자 프로필 |
| `tours` | id, name, date, location, invite_code(UNIQUE), access_code, created_by_name, deleted_at | soft delete |
| `participants` | id, tour_id(FK), name, added_by, last_modified_by | 투어 참여자 |
| `expenses` | id, tour_id(FK), name, amount(numeric), currency, exchange_rate, paid_by(FK participants), split_among(int[]), split_type, split_amounts(jsonb), receipt_url | 비용 |
| `waivers` | id, tour_id(FK), signer_name, personal_info(jsonb), health_checklist(bool[]), signature_url | 면책동의서 |
| `comments` | id, tour_id(FK), author_name, text, edited(bool) | 댓글 |
| `app_settings` | user_id(UUID FK), account_password, hidden_tour_ids(int[]) | 사용자별 설정 |
| `device_tokens` | user_id, token, platform(ios/android/web) | 푸시 알림 |

### Supabase RPC 함수
- `create_tour_rpc` - 투어 + 멤버 + 첫 참여자 원자적 생성
- `join_tour` - 초대 코드로 참여
- `lookup_tour_by_invite` - 초대 코드로 투어 조회
- `verify_admin_password` - 관리자 암호 검증

### Storage 구조
- `images/receipts/{tourId}/{expenseId}.jpg` - 영수증
- `images/signatures/{tourId}/{timestamp}.png` - 서명

---

## CORE BUSINESS LOGIC

### 정산 알고리즘 (store.ts - calculateSettlement)
1. 각 참여자 잔액 계산: `결제액 - 부담액`
   - 결제액: expense.paidBy === 본인인 비용의 합
   - 부담액: expense.splitAmong에 포함된 비용 중 본인 몫 (균등 or 커스텀)
2. 외화 비용은 exchangeRate로 KRW 환산
3. 차변자(돈 받을 사람) / 채변자(돈 보낼 사람) 분류
4. 그리디 매칭: 가장 큰 채권자-채무자부터 상쇄 → 최소 이체 수 도출
5. 결과: `Settlement[]` (A→B 얼마)

### 통화 지원
- KRW(기본), USD, PHP, THB, IDR, JPY + 커스텀 통화
- 환율 자동 조회: `er-api.com/v6/latest/KRW`

### 데이터 보호
| 행동 | 필요한 인증 |
|------|------------|
| 비용 수정/삭제 | 투어 accessCode (4자리 PIN) |
| 투어 삭제 | 투어 accessCode |
| 프로필 수정 | account_password (설정한 경우) |
| 관리자 접근 | 별도 admin_password (RPC 검증) |

### Soft Delete & 복원
- 투어 삭제 시 `deleted_at` 설정 (하드 삭제 아님)
- 7일 이내 임시보관함에서 복원 가능
- 7일 경과 시 자동 하드 삭제 (cleanupTrash)

---

## AUTH FLOW

### 인증 방식 (AuthContext.tsx)
| 방식 | 웹 | 네이티브 |
|------|-----|---------|
| 이메일/비밀번호 | 표준 | 표준 |
| 카카오 OAuth | 리다이렉트 | 시스템 브라우저 + 딥링크 + PKCE |
| 구글 OAuth | 리다이렉트 | `@capacitor/browser` (Chrome Custom Tab, WebView 403 회피) |

### OAuth 토큰 처리
- Supabase implicit flow: `#access_token=...&refresh_token=...` (URL hash)
- PKCE flow: `?code=...` → `exchangeCodeForSession()`
- 딥링크: `com.nosdivers.app://callback` → `CapApp.addListener("appUrlOpen")`

### 신규 사용자 흐름
OAuth 로그인 → user_metadata(full_name, preferred_username) → profiles.name 동기화 → 프로필 설정 화면 (이름 필수)

### 권한 구조
- **일반 사용자**: 자신이 참여한 투어만 접근
- **투어 개설자**: 투어 수정/삭제 (PIN)
- **관리자**: 전체 투어/동의서/댓글 관리 (관리자 암호)

---

## EXPORT CAPABILITIES

### Excel (export-excel.ts) - 3시트
1. **정산 매트릭스**: 참여자별 인당정산/결제/최종금액 + 비용별 O/X 색상코딩
2. **송금 내역**: 보내는사람 → 받는사람, 금액
3. **영수증 목록**: 영수증 첨부된 비용만

### PDF (export-pdf.ts)
- 참여자 요약 + 비용 O/X 매트릭스 (참여자 수에 따라 landscape/portrait 자동, 적응형 글꼴)

### 면책동의서 PDF (export-waiver-pdf.ts)
- 6개 면책조항, 건강체크, 개인정보, 서명이미지 (A4 자동 페이지 분할)

---

## NATIVE INTEGRATION (Capacitor)

### 사용 중인 Capacitor 플러그인
| 플러그인 | 용도 |
|----------|------|
| `@capacitor/browser` | OAuth 리다이렉트 (Chrome Custom Tab) |
| `@capacitor/preferences` | 로컬 키-값 저장 |
| `@capacitor/push-notifications` | 푸시 알림 토큰 |
| `@capacitor/filesystem` | 파일 저장 (캐시 → Share) |
| `@capacitor/camera` | 영수증 사진 촬영 |
| `@capacitor/splash-screen` | 스플래시 (#0A1628 배경) |

### capacitor.config.ts
- `allowNavigation`: Supabase, Kakao, Google, localhost 허용
- `SplashScreen`: 흰색 배경, 자동 숨김
- `PushNotifications`: badge, sound, alert 활성화

---

## DEPLOYMENT STATUS

### Android - DONE
- Play Store 내부 테스트 배포 완료 (v1.3.0, versionCode: 10)
- OAuth, CSS, 아이콘/스플래시 완료

### iOS - BLOCKED (Capacitor 8.x Swift 호환성)
- Codemagic CI/CD 설정 완료, 코드 서명 동작 확인
- **빌드 #9~#15 실패**: 플러그인 Swift 소스가 SPM 코어 API와 불일치

### iOS 빌드 에러
```
PreferencesPlugin.swift: missing argument for parameter #2 in call
PreferencesPlugin.swift: value of type 'CAPPluginCall' has no member 'reject'
PushNotificationsPlugin.swift: same errors
```

### 이미 시도하고 실패한 것 (반복하지 마라)
| 시도 | 결과 |
|------|------|
| Xcode 16.2 / 16.1 / 16.0 / 15.4 | Swift 버전 문제 아님 |
| Capacitor 코어 8.3.0 → 8.0.1 | 동일 에러 |
| `npx cap sync ios` + SPM sed 치환 | 동일 에러 |

### 해결 방향 (우선순위대로)
1. **Capacitor 7.x 전체 다운그레이드** (코어 + 모든 플러그인)
2. Capacitor 6.x 다운그레이드
3. 플러그인 GitHub에서 Capacitor 8 호환 PR 확인
4. `capacitor-swift-pm` 특정 태그로 버전 고정

### SPM 메커니즘 (이해 필수)
- `capacitor-swift-pm`: GitHub 패키지, Xcode SPM이 가져옴
- 플러그인 Swift 소스: `node_modules/@capacitor/*/ios/Sources/`
- `npx cap sync ios` → `CapApp-SPM/Package.swift` 재생성
- `Package.swift`의 `exact: "X.Y.Z"`가 SPM 코어 버전 결정
- **코어 API와 플러그인 Swift 소스가 반드시 일치해야 빌드 성공**

---

## BUILD COMMANDS

```bash
cd nos-divers-web
npm ci                       # 의존성 설치
npm run dev                  # 로컬 개발 (localhost:5174)
npm run build                # 프로덕션 빌드
npx cap sync ios             # iOS 동기화
npx cap sync android         # Android 동기화
npx cap open ios             # Xcode 열기
npx cap open android         # Android Studio 열기
```

### Codemagic iOS 배포 (자동)
```bash
git push origin main         # → Codemagic 자동 트리거
# fetch-signing-files → build-ipa → app-store-connect publish
```

### Codemagic 설정 (건드리지 말 것)
- App Store Connect API 키: Issuer `fe36c7ce-...`, Key `XT8J4W9R2R`
- CERTIFICATE_PRIVATE_KEY: code_signing 그룹
- codemagic.yaml: **저장소 루트에 필수**

---

## DECISION TREE

```
기능 버그 시:
├─ OAuth 실패 → AuthContext.tsx 확인 (딥링크 스키마, PKCE, 토큰 파싱)
├─ 정산 오류 → store.ts calculateSettlement 로직 확인
├─ 데이터 안보임 → useSupabase.ts 훅 + Supabase RLS 정책 확인
├─ PDF/Excel 깨짐 → utils/export-*.ts 확인
├─ CSS 깨짐 → index.css (height:100%, safe-area, overflow)
└─ 네이티브 기능 → platform.ts isNative() 분기 확인

빌드 실패 시:
├─ Swift 에러 → Capacitor 버전 호환성 (코어 vs 플러그인)
├─ 코드 서명 → CERTIFICATE_PRIVATE_KEY (Codemagic)
├─ Node 버전 → 22 이상 확인
├─ SPM resolve → Package.swift exact 버전 확인
└─ 기타 → codemagic.yaml 빌드 로그 확인
```

---

## SELF-VERIFICATION

작업 완료 전 반드시 확인:
- [ ] `npm run build` 성공?
- [ ] `npx cap sync ios` / `android` 에러 없음?
- [ ] OAuth (카카오/구글/이메일) 로그인 정상?
- [ ] 정산 계산 정확? (외화 환산 포함)
- [ ] CSS 레이아웃 정상? (탭바, safe-area, 스크롤)
- [ ] PDF/Excel 내보내기 정상?
- [ ] 면책동의서 서명 → 저장 → 조회 흐름 정상?
- [ ] git commit + push 완료?
