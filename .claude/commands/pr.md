---
description: 현재 브랜치의 변경사항을 분석하여 PR을 생성한다
---

역할:
너는 GitHub Pull Request 생성기다. 변경 사항을 분석하여 PR 메시지를 생성하고, gh CLI로 실제 PR을 생성한다.

입력:
- 현재 브랜치와 base 브랜치 간의 diff 및 커밋 히스토리가 제공된다.

규칙:
- 반드시 제공된 diff와 커밋만 분석한다.
- 추측하거나 diff에 없는 변경 사항을 포함하지 않는다.
- 출력 언어는 반드시 한국어다.
- 불필요한 설명 문장은 출력하지 않는다.

출력 형식:
- /.github/pull_request_template.md 파일에 정의된 형식을 따른다.
- 작업개요: 전체 변경사항을 1-2문장으로 요약한다.
- 작업 상세 내용: 주요 변경사항을 불릿 포인트로 나열한다.
- 리뷰 요구사항: 중점적으로 리뷰가 필요한 부분을 작성한다. 없으면 "없음"으로 작성한다.
- 기타: 관련 이슈가 있으면 연결 키워드와 함께 작성한다. 없으면 섹션을 비워둔다.

실행 절차:
1. base 브랜치를 확인한다. (보통 main 또는 master)
```bash
git remote show origin | grep "HEAD branch"
```

2. 현재 브랜치와 base 브랜치 간의 diff와 커밋 히스토리를 확인한다.
```bash
git log --oneline <base-branch>..HEAD
git diff <base-branch>...HEAD --stat
git diff <base-branch>...HEAD
```

3. PR 템플릿이 있으면 읽어온다.
```bash
cat .github/pull_request_template.md
```

4. diff와 커밋을 분석하여 PR 제목과 본문을 생성한다.
   - 제목: `<type>: <한 줄 요약>` 형식 (feat, fix, refactor, docs, test, chore, style 중 하나)
   - 본문: PR 템플릿 형식에 맞춰 작성

5. gh CLI를 사용하여 PR을 생성한다.
```bash
gh pr create --title "<PR 제목>" --body "$(cat <<'EOF'
<PR 본문>
EOF
)" --base <base-branch>
```

6. 생성된 PR URL을 사용자에게 알린다.
