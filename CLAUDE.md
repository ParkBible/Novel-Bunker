# CLAUDE.md

이 파일은 Claude Code(claude.ai/code)가 이 저장소에서 작업할 때 참고하는 가이드입니다.

## 명령어

```bash
pnpm install     # 의존성 설치
pnpm dev         # 개발 서버 실행 (http://localhost:3000)
pnpm build       # 프로덕션 빌드
pnpm lint        # Biome 린터 실행
pnpm format      # Biome 코드 포맷
```

## 환경 설정

AI 기능(피드백, 문법 검사)을 사용하려면 `.env.local`에 `GEMINI_API_KEY`가 필요합니다.

## 아키텍처

NovelBunker는 Next.js 16 App Router 기반의 로컬 우선 소설 작성 에디터입니다.

### 데이터 레이어
- **Dexie.js를 통한 IndexedDB**: 모든 데이터를 브라우저 클라이언트에 저장
- `app/(shared)/db/index.ts`: 데이터베이스 스키마 정의 (Chapter, Scene, Character, Setting)
- `app/(shared)/db/operations.ts`: CRUD 작업 레이어 (`chapterOps`, `sceneOps`, `characterOps`, `settingsOps`)
- 컴포넌트는 `db`에 직접 접근하지 않고 operations 레이어를 사용해야 합니다

### 상태 관리
- `app/(shared)/stores/editorStore.ts`의 **Zustand 스토어**
- chapters, scenes, characters, UI 상태를 중앙에서 관리
- `loadData()`는 최초 실행 시 데모 데이터를 초기화하고 IndexedDB에서 전체 데이터를 불러옵니다

### UI 레이아웃 (3패널 에디터)
- **TreePanel** (좌측): 챕터/씬 네비게이션 트리
- **ChapterContent** (중앙): TipTap 리치 텍스트 에디터가 포함된 씬 카드
- **ContextPanel** (우측): 선택된 씬 정보, AI 피드백

### 라우팅
- `/` - 첫 번째 챕터로 리다이렉트
- `/chapter/[id]` - 챕터 메인 에디터 뷰
- 모든 경로는 `app/(shared)/routes.ts`에서 중앙 관리

### AI 연동
- `app/(shared)/utils/gemini.ts`: Gemini API 래퍼 함수
- `app/api/ai/feedback/route.ts`: 씬 피드백 엔드포인트
- `app/api/ai/grammar/route.ts`: 문법 검사 엔드포인트

## 코드 스타일

- 린팅/포맷팅은 Biome 사용 (들여쓰기 4칸, 큰따옴표)
- 경로 별칭: `@/*`는 루트에 매핑
- 사용자에게 노출되는 문자열은 한국어로 작성
