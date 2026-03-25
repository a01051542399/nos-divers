# NoS Divers 앱 데모 실행 가이드

## 사전 준비

아래 중 하나를 설치해야 합니다:

### 필수 설치
- **Node.js 20+**: https://nodejs.org
- **pnpm**: `npm install -g pnpm`

### DB (택 1)
- **방법 A**: Docker Desktop 설치 → MySQL 자동 실행
- **방법 B**: MySQL 8.0 직접 설치

---

## 방법 1: Docker + 로컬 개발 (추천)

```bash
# 1. 프로젝트 폴더로 이동
cd nos-divers-app

# 2. MySQL만 Docker로 띄우기
docker compose up db -d

# 3. DB가 준비될 때까지 잠시 대기 (약 10초)

# 4. 의존성 설치
pnpm install

# 5. 개발 서버 실행 (API + Metro 동시 실행)
pnpm dev
```

실행 후:
- **웹 브라우저**: http://localhost:8081 에서 앱 확인
- **API 서버**: http://localhost:3000/api/health 로 확인

---

## 방법 2: Docker만으로 전체 실행

```bash
# 1. 프로젝트 폴더로 이동
cd nos-divers-app

# 2. 전체 빌드 + 실행
docker compose up --build -d

# 3. 로그 확인
docker compose logs -f
```

이 방법은 API 서버만 실행됩니다 (프론트엔드는 별도 실행 필요).

---

## 방법 3: 전부 로컬 설치

```bash
# 1. MySQL 8.0 설치 및 실행
#    - Windows: https://dev.mysql.com/downloads/installer/
#    - Mac: brew install mysql

# 2. MySQL에서 DB 생성
mysql -u root -p < init-database.sql

# 3. .env 파일에서 DATABASE_URL 수정
#    DATABASE_URL=mysql://root:비밀번호@localhost:3306/nos_divers

# 4. 의존성 설치
pnpm install

# 5. 개발 서버 실행
pnpm dev
```

---

## 실행 확인 체크리스트

| 항목 | URL | 기대 결과 |
|------|-----|-----------|
| API 서버 | http://localhost:3000/api/health | `{"status":"ok"}` |
| 웹 앱 | http://localhost:8081 | 투어 목록 화면 |

---

## 데모에서 테스트할 기능

1. **투어 만들기**: + 버튼 → 이름/날짜/장소 입력 → 만들기
2. **참가자 추가**: 투어 클릭 → 참가자 탭 → 이름 입력 → 추가
3. **비용 추가**: 비용 탭 → + 비용 추가 → 항목/금액/결제자 선택
4. **정산 확인**: 정산 탭 → "A → B: 50,000원" 형태로 자동 계산
5. **면책동의서**: 면책서 탭 → 서명하기 → 5단계 진행
6. **초대코드 참가**: 다른 기기에서 /join 페이지로 이동

---

## OAuth 로그인 설정 (선택사항)

로그인 없이도 핵심 기능(투어/정산/면책서)은 모두 사용 가능합니다.
로그인을 테스트하려면:

### Google OAuth
1. https://console.cloud.google.com 접속
2. 새 프로젝트 생성
3. API 및 서비스 → 사용자 인증 정보 → OAuth 2.0 클라이언트 ID 만들기
4. 승인된 리디렉션 URI: `http://localhost:3000/api/oauth/google/callback`
5. 클라이언트 ID와 시크릿을 .env에 입력

### 카카오 로그인
1. https://developers.kakao.com 접속
2. 애플리케이션 추가하기
3. 앱 키 → REST API 키 복사
4. 카카오 로그인 활성화
5. Redirect URI: `http://localhost:3000/api/oauth/kakao/callback`
6. REST API 키를 .env의 KAKAO_CLIENT_ID에 입력

---

## 모바일에서 테스트

```bash
# iOS 시뮬레이터
pnpm ios

# Android 에뮬레이터
pnpm android

# 실제 기기 (Expo Go 앱 필요)
# Metro가 실행된 상태에서 터미널에 표시된 QR코드 스캔
```

---

## 문제 해결

### "pnpm: command not found"
```bash
npm install -g pnpm
```

### "MySQL connection refused"
```bash
# Docker MySQL 상태 확인
docker compose ps
docker compose logs db
```

### "Port 3000 already in use"
```bash
# 다른 포트로 실행
PORT=3001 pnpm dev:server
```
