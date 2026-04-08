# WeDive (위다이브) — 앱 설계 문서

> 다이버들의 네트워킹 + 투어 정산 + 커뮤니티 플랫폼

---

## 1. 프로젝트 개요

| 항목 | 값 |
|------|-----|
| 앱 이름 | WeDive (위다이브) |
| 용도 | 다이버 네트워킹, 투어 정산, 면책동의서, 커뮤니티 |
| 타겟 | 한국 다이버 (한국어 앱) |
| 스택 | Flutter + Dart + Supabase |
| 배포 | iOS + Android 동시 |
| 벤치마크 | 리멤버(Remember) 네트워킹 구조 |

### 핵심 컨셉

리멤버의 비즈니스 네트워킹 구조를 다이빙에 적용:
- 다이버의 명함 = 소속단체 + 자격레벨 + 로그수
- 커뮤니티에서는 닉네임, 정산에서는 본명
- 무료 유틸리티(정산) → 사용자 확보 → 네트워크 효과(커뮤니티) → 성장

---

## 2. 앱 구조

### 하단 탭 네비게이션

```
[ 트립 ]    [ 라운지 ]    [ 프로필 ]
```

### 전체 화면 맵

```
[트립 탭]
├── TripList             # 내 투어 목록 + 생성
├── TripDetail           # 투어 상세 - 3개 탭:
│   ├── 참여자 탭        #   참여자 추가/관리, 동의서 서명 상태, 댓글
│   ├── 비용 탭          #   비용 CRUD, 다중통화(6종+커스텀), 환율자동, 영수증, 분배
│   └── 정산 탭          #   자동 정산, 이체 내역, PDF/Excel 내보내기
├── TripJoin             # 초대코드(6자리)로 참여
└── WaiverSign           # 동의서: 내용 확인 → 건강 체크 → 캔버스 서명

[라운지 탭]
├── LoungeMain           # 통합 게시판
│   ├── 카테고리 필터    #   전체|자유|투어/버디|포인트|장터|교육|사진/영상|샵리뷰|공지
│   ├── 검색             #   제목, 내용, 작성자
│   └── 정렬             #   최신순|인기순|댓글순
├── PostDetail           # 게시글 상세 (댓글, 좋아요)
└── PostWrite            # 게시글 작성 (텍스트+사진+동영상+URL)

[프로필 탭]
├── MyProfile            # 내 다이버 카드 (사진, 본명, 닉네임, 단체, 레벨, 로그수)
├── ProfileEdit          # 프로필 편집
├── WaiverTemplates      # 내 동의서 양식 관리
│   ├── 기본 양식        #   WeDive 제공
│   ├── 커스텀 양식      #   자유 편집
│   └── + 새 양식        #   법적 면책 체크박스 필수
├── NotificationSettings # 알림 설정 (항목별 ON/OFF)
├── DisplaySettings      # 라이트/다크/시스템 테마
└── Account              # 로그인 관리, 로그아웃
```

### 표시 규칙

| 화면 | 이름 표시 | 사진 |
|------|-----------|------|
| 트립 (정산) | 본명 | O |
| 라운지 (게시판) | 닉네임 | O |
| 프로필 | 전체 정보 | O |

---

## 3. 데이터 모델

### User (사용자)

```
User {
  id: UUID
  email: String
  name: String (본명 — 정산에서 사용)
  nickname: String (닉네임 — 라운지에서 사용)
  profileImage: String (프로필 사진 URL)
  organization: String (소속단체: PADI/SSI/NAUI/SNSI/CMAS/직접입력)
  certLevel: String (OW/AOW/RD/MD/Tec입문/Tec다이버/Tec심화)
  isInstructor: Boolean (강사 여부)
  logCount: Int (로그 수 — 직접 입력)
  phone: String
  birthDate: Date
  createdAt: DateTime
}
```

### Trip (투어)

```
Trip {
  id: Int
  name: String
  date: String
  location: String
  inviteCode: String (6자리)
  accessCode: String (4자리 PIN)
  createdBy: UUID (개설자 User ID)
  waiverTemplateId: Int (사용할 동의서 양식)
  createdAt: DateTime
  updatedAt: DateTime
  deletedAt: DateTime? (soft delete)
}
```

### Participant (참여자)

```
Participant {
  id: Int
  tripId: Int (FK Trip)
  userId: UUID (FK User)
  name: String
  createdAt: DateTime
}
```

### Expense (비용)

```
Expense {
  id: Int
  tripId: Int (FK Trip)
  name: String
  amount: Decimal
  currency: String
  exchangeRate: Decimal
  paidBy: Int (FK Participant)
  splitAmong: Int[] (Participant ID 목록)
  splitType: String (equal/custom)
  splitAmounts: JSON ({participantId: amount})
  receiptImage: String (영수증 URL)
  createdAt: DateTime
}
```

### Settlement (정산 결과)

```
Settlement {
  from: Int
  to: Int
  fromName: String
  toName: String
  amount: Decimal
}
```

### WaiverTemplate (동의서 양식)

```
WaiverTemplate {
  id: Int
  userId: UUID (소유자)
  title: String (양식 이름)
  content: String (본문 — 자유 편집)
  healthChecklist: String[] (건강 체크 항목 목록)
  disclaimerAgreed: Boolean (법적 면책 확인 완료)
  isDefault: Boolean (WeDive 기본 양식 여부)
  createdAt: DateTime
  updatedAt: DateTime
}
```

### Waiver (서명된 동의서)

```
Waiver {
  id: Int
  tripId: Int (FK Trip)
  templateId: Int (FK WaiverTemplate)
  signerUserId: UUID
  signerName: String
  personalInfo: JSON
  healthChecklist: Boolean[]
  signatureImage: String (서명 이미지 URL)
  signedAt: DateTime
}
```

### Post (게시글)

```
Post {
  id: Int
  authorId: UUID (FK User)
  category: String (자유/투어버디/포인트/장터/교육/사진영상/샵리뷰/공지)
  title: String
  content: String
  images: String[] (사진 URL 목록)
  videoUrl: String?
  linkUrl: String?
  likeCount: Int
  commentCount: Int
  createdAt: DateTime
  updatedAt: DateTime
}
```

### Comment (댓글)

```
Comment {
  id: Int
  postId: Int (FK Post)
  authorId: UUID (FK User)
  text: String
  createdAt: DateTime
  edited: Boolean
}
```

### Like (좋아요)

```
Like {
  id: Int
  postId: Int (FK Post)
  userId: UUID (FK User)
  createdAt: DateTime
}
```

### NotificationSetting (알림 설정)

```
NotificationSetting {
  userId: UUID
  tripInvite: Boolean
  tripJoin: Boolean
  settlementComplete: Boolean
  waiverRequest: Boolean
  postComment: Boolean
  postLike: Boolean
}
```

---

## 4. 인증 & 보안

### 로그인 방식

| 방식 | 설명 |
|------|------|
| 카카오 OAuth | 한국 사용자 메인 |
| 구글 OAuth | 보조 |
| 애플 Sign In | iOS 필수 요건 |

### 신규 사용자 흐름

```
소셜 로그인 → 필수 정보 입력 (본명, 닉네임, 프로필 사진) →
선택 정보 (소속단체, 레벨, 로그수) → 완료
```

### 데이터 보호

| 행동 | 필요한 인증 |
|------|------------|
| 비용 수정/삭제 | 투어 PIN (4자리) |
| 투어 삭제 | 투어 PIN |
| 프로필 수정 | 로그인 상태 확인 |
| 게시글 수정/삭제 | 본인만 가능 |
| 댓글 수정/삭제 | 본인만 가능 |

### Soft Delete

- 투어 삭제 시 `deletedAt` 설정
- 7일 이내 복원 가능
- 7일 후 자동 하드 삭제

---

## 5. 기술 아키텍처

### 스택

```
┌─────────────────────────────────┐
│          WeDive App             │
│    Flutter + Dart               │
├─────────────────────────────────┤
│        Supabase                 │
│  ┌───────┬──────┬────────┐     │
│  │ Auth  │  DB  │Storage │     │
│  │카카오 │Postgre│ 사진  │     │
│  │구글   │ SQL  │ 서명  │     │
│  │애플   │      │ 영수증│     │
│  └───────┴──────┴────────┘     │
├─────────────────────────────────┤
│     외부 API                    │
│  환율: er-api.com               │
│  푸시: Firebase Cloud Messaging │
└─────────────────────────────────┘
```

### Supabase Storage 구조

```
images/
├── profiles/{userId}.jpg
├── receipts/{tripId}/{expenseId}.jpg
├── signatures/{tripId}/{timestamp}.png
└── posts/{postId}/{index}.jpg
```

### 주요 Flutter 패키지

| 용도 | 패키지 |
|------|--------|
| Supabase 연동 | supabase_flutter |
| 소셜 로그인 | google_sign_in, sign_in_with_apple, kakao_flutter_sdk |
| 푸시 알림 | firebase_messaging |
| 카메라 | image_picker |
| 서명 캔버스 | signature |
| PDF 생성 | pdf |
| Excel 생성 | syncfusion_flutter_xlsio |
| 테마 | flex_color_scheme |
| 상태관리 | riverpod |

### 배포

| 플랫폼 | 방법 |
|--------|------|
| Android | Google Play Store |
| iOS | App Store (Codemagic CI/CD) |

---

## 6. 자격 레벨 체계

### 프로필 자격 설정 UI

```
소속 단체: [PADI] [SSI] [NAUI] [SNSI] [CMAS] [직접입력]

자격 레벨 (택 1):
○ Open Water (OW)
○ Advanced Open Water (AOW)
○ Rescue Diver (RD)
○ Master Scuba Diver (MD)
○ Tec 입문
○ Tec 다이버
○ Tec 심화

☐ 강사 (체크박스 — 레벨과 별도)
```

### 단체별 대응표

| 등급 | PADI | SSI | NAUI | SNSI | CMAS |
|------|------|-----|------|------|------|
| 초급 | Open Water | Open Water | Scuba Diver | Open Water | ★ |
| 중급 | Advanced OW | Advanced Adventurer | Advanced | Advanced OW | ★★ |
| 상급 | Rescue Diver | Diver Stress & Rescue | Rescue | Rescue Diver | ★★★ |
| 최상급 | Master Scuba Diver | Master Diver | Master Diver | Master Diver | - |

### 테크니컬 다이버

| 등급 | 설명 |
|------|------|
| Tec 입문 | TDI Intro to Tech, PADI Tec 40 등 |
| Tec 다이버 | TDI Advanced Nitrox, PADI Tec 50 등 |
| Tec 심화 | Trimix, CCR(폐쇄식 리브리더) 등 |

---

## 7. 면책동의서 시스템

### 구조

```
[프로필] → 내 동의서 템플릿 관리
├── 기본 양식 (WeDive 제공, 수정 가능)
├── 내 양식 1 (커스텀)
├── 내 양식 2 (커스텀)
└── + 새 양식 만들기

각 양식:
├── 양식 이름
├── 본문 내용 (자유 편집)
├── 건강 체크리스트 (항목 추가/수정/삭제)
└── ⚠️ 법적 면책 체크박스 (필수, 삭제 불가):
    "WeDive는 서명을 받는 도구만 제공하며,
     동의서의 법적 효력을 보장하지 않습니다"
```

### 서명 흐름

```
투어 개설자가 동의서 양식 선택 → 참여자에게 서명 요청 →
참여자: 내용 확인 → 건강 체크 → 캔버스 서명 → PDF 저장
```

---

## 8. 라운지 (커뮤니티)

### 통합 게시판

```
[통합 게시판]
├── 카테고리 필터: 전체|자유|투어/버디|포인트|장터|교육|사진/영상|샵리뷰|공지
├── 검색 (제목, 내용, 작성자)
└── 정렬: 최신순|인기순|댓글순
```

### 게시글 작성 요소

- 텍스트
- 사진 (다중)
- 동영상
- URL 링크

### 인터랙션

- 댓글 (본인만 수정/삭제)
- 좋아요 (1종)

---

## 9. 알림

### 항목별 ON/OFF 설정

| 알림 항목 | 기본값 |
|-----------|--------|
| 투어 초대 | ON |
| 투어 참여 | ON |
| 정산 완료 | ON |
| 동의서 서명 요청 | ON |
| 게시글 댓글 | ON |
| 게시글 좋아요 | ON |

---

## 10. 정산 기능

NoS Divers와 동일:

### 정산 알고리즘

1. 각 참여자 잔액 계산: 결제액 - 부담액
2. 외화 비용은 exchangeRate로 KRW 환산
3. 차변자/채변자 분류
4. 그리디 매칭: 최소 이체 수 도출
5. 결과: Settlement[]

### 통화 지원

- KRW(기본), USD, PHP, THB, IDR, JPY + 커스텀 통화
- 환율 자동 조회: er-api.com

### 내보내기

- PDF: 참여자 요약 + 비용 O/X 매트릭스
- Excel: 3시트 (정산매트릭스 + 송금내역 + 영수증)
- 면책동의서 PDF: A4, 서명이미지 포함

---

## 11. 개발 단계 (점진적 확장)

### 1단계 — 트립 + 기본

- 로그인 (카카오 + 구글 + 애플)
- 프로필 (사진, 본명, 닉네임, 단체, 레벨, 로그수, 강사 체크)
- 투어 (생성, 초대코드 참여, 참여자 관리)
- 비용 (CRUD, 다중통화, 환율, 영수증, 균등/커스텀 분배)
- 정산 (자동 계산, PDF/Excel 내보내기)
- 동의서 (템플릿 관리, 서명, PDF, 법적 면책 체크)
- 테마 (라이트/다크/시스템)

### 2단계 — 라운지

- 통합 게시판 + 카테고리 필터 8종
- 게시글 (텍스트 + 사진 + 동영상 + URL)
- 댓글 (작성/수정/삭제)
- 좋아요
- 검색 + 정렬

### 3단계 — 마무리

- 푸시 알림 (항목별 ON/OFF)
- Soft Delete (투어 7일 복원)
- iOS + Android 동시 배포
