# NovelBunker

소설 작문을 어시스트하는 Local-first 웹 에디터

## 특징

- ✍️ **NovelCrafter 스타일의 계층형 에디터**: 챕터와 씬을 관리하는 직관적인 3단 레이아웃
- 🤖 **AI 기반 피드백**: DeepSeek API를 활용한 시놉시스/캐릭터 설정 기반 소설 피드백
- 💾 **Local-first 아키텍처**: Dexie.js를 통해 브라우저에 안전하게 저장
- 🎨 **미니멀한 디자인**: Tailwind CSS 4로 구현한 깔끔한 UI

## 기술 스택

- Framework: Next.js 16.1.4, React 19.2
- Language: TypeScript
- UI/UX: Tailwind CSS 4.0
- Editor: TipTap
- Database: Dexie.js (IndexedDB)
- AI Engine: DeepSeek API (`deepseek-chat`, `deepseek-reasoner`)
- Icon: Lucide React
- State Management: Zustand

## 시작하기

### 1. 의존성 설치

이 프로젝트는 `pnpm`을 패키지 매니저로 사용합니다.

```bash
pnpm install
```

### 2. 환경 변수 설정

`.env.example`을 `.env.local`로 복사한 뒤 값을 채우세요. Vercel에 배포할 때는 같은 값을 프로젝트 환경변수(Production)에 넣습니다.

| 변수 | 설명 |
| --- | --- |
| `DEEPSEEK_API_KEY` | DeepSeek API 키 ([platform.deepseek.com](https://platform.deepseek.com/api_keys)). 서버에만 있고 브라우저로 내려가지 않습니다. |
| `GOOGLE_CLIENT_ID` | Google OAuth 클라이언트 ID (웹 애플리케이션). 클라이언트는 `/api/auth/config`로 이 값을 받아 씁니다. |
| `GOOGLE_CLIENT_SECRET` | 같은 OAuth 클라이언트의 보안 비밀 |
| `ALLOWED_EMAILS` | AI 기능을 쓸 수 있는 구글 계정 (쉼표로 구분) |
| `SESSION_SECRET` | 세션 쿠키 서명용 비밀값, 32자 이상 (`openssl rand -base64 32`) |

- AI API(`/api/ai/*`)는 `ALLOWED_EMAILS`에 있는 계정으로 구글 로그인(Drive 백업 로그인과 동일)한 경우에만 동작합니다.
- 배포 환경(`NODE_ENV=production` 또는 Vercel)에서 인증 변수가 빠져 있으면 AI API는 503으로 막힙니다. 로컬 개발에서 인증 변수를 모두 비워 두면 로그인 없이 AI API를 쓸 수 있습니다.

#### Google Cloud Console 설정

1. Google Drive API를 사용 설정합니다.
2. OAuth 동의 화면: 범위에 `openid`, `.../auth/userinfo.email`, `.../auth/drive.appdata`를 추가합니다.
   - 게시 상태를 **"프로덕션 단계(In production)"** 로 바꾸세요. "테스트" 상태에서는 refresh token이 7일 뒤 만료되어 매주 다시 로그인해야 합니다. (본인만 쓰는 앱이면 검증 없이 경고 화면만 넘기면 됩니다)
3. 사용자 인증 정보 → OAuth 클라이언트 ID (웹 애플리케이션)
   - 승인된 JavaScript 원본: `https://<배포 도메인>`, `http://localhost:3000`
   - 승인된 리디렉션 URI: `https://<배포 도메인>/auth`, `http://localhost:3000/auth`

### 3. 개발 서버 실행

```bash
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 NovelBunker를 사용하세요.

## 사용 방법

### 기본 워크플로우

1. **왼쪽 패널 (구조)**: 챕터와 씬을 탐색하고 관리합니다.
2. **중앙 패널 (에디터)**: 씬을 카드 형태로 작성하고 편집합니다.
3. **오른쪽 패널 (컨텍스트)**: 선택한 씬의 정보와 AI 피드백을 확인합니다.

### 주요 기능

- **씬 추가**: 씬 사이의 "씬 추가" 버튼을 클릭
- **자동 저장**: 입력 시 자동으로 브라우저에 저장됨
- **AI 피드백**: 오른쪽 패널에서 "피드백 요청" 버튼 클릭

## 데이터 저장

모든 데이터는 브라우저의 IndexedDB에 저장됩니다. 브라우저 캐시를 삭제하지 않는 한 데이터는 안전하게 보관됩니다.

## 빌드

```bash
pnpm build
pnpm start
```

## 라이선스

MIT
