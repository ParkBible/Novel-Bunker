# NovelBunker

소설 작문을 어시스트하는 Local-first 웹 에디터

## 특징

- ✍️ **NovelCrafter 스타일의 계층형 에디터**: 챕터와 씬을 관리하는 직관적인 3단 레이아웃
- 🤖 **AI 기반 피드백**: Gemini API를 활용한 시놉시스/캐릭터 설정 기반 소설 피드백
- 💾 **Local-first 아키텍처**: Dexie.js를 통해 브라우저에 안전하게 저장
- 🎨 **미니멀한 디자인**: Tailwind CSS 4로 구현한 깔끔한 UI

## 기술 스택

- Framework: Next.js 16.1.4, React 19.2
- Language: TypeScript
- UI/UX: Tailwind CSS 4.0
- Editor: TipTap
- Database: Dexie.js (IndexedDB)
- AI Engine: Gemini 2.0 Flash API
- Icon: Lucide React
- State Management: Zustand

## 시작하기

### 1. 의존성 설치

이 프로젝트는 `pnpm`을 패키지 매니저로 사용합니다.

```bash
pnpm install
```

### 2. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 Gemini API 키를 추가하세요:

```bash
GEMINI_API_KEY=your_api_key_here
```

> Gemini API 키는 [Google AI Studio](https://aistudio.google.com/app/apikey)에서 무료로 발급받을 수 있습니다.

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
