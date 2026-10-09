# bb-chat-ui

<p align="center">
  <strong>chat message and composer chrome for BB.</strong>
</p>

<p align="center">
  <a href="#install">install</a> · <a href="#what-it-does">what it does</a> · <a href="#related">related</a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-666666?labelColor=333333" alt="MIT license" /></a>
</p>

---

A BB plugin that restyles the thread transcript and composer. Sidebar open/close motion stays in `sidebar`; thread row theming stays in `bb-thread-theme`.

- **composer** — frosted prompt box; quote and mention pills stay as pills
- **messages** — user attachments, queued messages, and jump/TOC chrome
- **haptics** — `impact-light` on send when the host supports it
- **workspace** — a compact diff pill for checkout line changes

## install

Requires [bb](https://getbb.app) with a compatible Plugin SDK (`engines` in `package.json`).

From a clone:

```bash
git clone https://github.com/HIJKM/bb-chat-ui.git
cd bb-chat-ui
bb plugin install . --yes
```

Or from GitHub:

```bash
bb plugin install 'git:https://github.com/HIJKM/bb-chat-ui.git@main' --yes
```

Plugin id: `bb-chat-ui`.

## what it does

Registers composer customize plus content scripts in `app.tsx` (`composer-glass`, quote/mention pills, queued messages, thread TOC, user attachments, workspace diff pill). It does not own the sidebar list or ribbon.

컴포저·변경 필·맨 밑으로 버튼·Agentation staging의 표면은 해당 채팅 배경의 색조를 유지하며 밝기만 조금 올린다. 순백에서는 기존 얇은 그림자로 구분한다. 일반 채팅은 `--background`, sidebar 톤은 `--sidebar`를 기준으로 한다. 고정 캔버스를 덮어쓰지 않는다. glass 불투명도는 라이트 68%, 다크 76%이며, 하이라이트는 흐린 inset `0 1px 3px`로 표면에 부드럽게 이어진다. 컴포저만 흰색을 라이트 60%, 다크 14%로 섞어 상단 반사광을 더 선명하게 한다. footer fade는 컴포저 위 64px까지 옅게 펼친다. 높이의 90%까지는 반투명으로 두고, 마지막 10%에서 채팅 배경색에 완전히 닿게 해 하단 경계를 잇는다. blur와 바깥 그림자, 모션은 유지한다. 다른 플러그인의 색 변수나 설정에 의존하지 않는다.

## 컴포저 위 정보 설정

전체 정보 목록에는 현재 데이터가 없는 계열도 `현재 없음`으로 남긴다. 모든 목록 항목은 계열별 아이콘을 표시하며, 현재 정보가 없는 상태에서도 아이콘을 유지한다. 호스트 펼침 화살표 대신 해당 계열 아이콘을 쓰고 Agentation은 원래 glyph를 보존한다. 선택하면 `현재 정보 없음`을 표시하며, 정보가 생기면 실제 상세로 바뀐다. 데이터가 없는 상단 필이나 가상의 Diff 수치는 만들지 않는다.

`Settings → Chat UI`에서 각 계열을 `상단 표시`, `목록에만 표시`, `끄기` 중 하나로 설정한다. Code Diff와 Child Thread는 기본으로 상단에 표시하고, 나머지는 목록에만 표시한다. 공간이 부족하면 상단 항목도 자동으로 전체 정보 버튼 안에 접힌다. `끄기`는 상단과 목록 모두에서 제외한다. 전부 끄면 정보 줄도 숨긴다. 스크롤할 내용이 남은 팝오버 가장자리에는 블러 그라데이션을 표시하고, 해당 끝에 도달하면 없앤다. 상세는 한 번에 하나만 펼친다. Code Diff도 먼저 변경 요약 팝오버를 열고, 그 안의 `Diff 패널 열기` 버튼으로 옆 패널에 이동한다.

기존 boolean 설정을 사용한 설치를 업그레이드할 때는 빌드·reload 전에 `bb plugin config bb-chat-ui --json`의 값을 보관하고, reload 후 같은 키에 `true → 상단 표시`, `false → 목록에만 표시`로 저장해 선택을 유지한다. 설정 변경으로 대기 메시지를 끄더라도 진행 중인 행 편집은 끝날 때까지 유지한다.

입력 요청 중에는 요청만 표시하고 입력창도 숨긴다. 요청이 끝나면 초안을 그대로 복원한다. 큐 편집 중에는 다른 상세로 전환하지 않는다. Archived 화면의 정보도 숨겨서 보관하며, 호스트 복구 버튼은 유지한다. 새 Child Thread는 bubble 모션으로 나타나며 reduced motion 설정을 따른다.

Child Thread는 배경 없는 색상 아바타 스택과 상태 점으로 표시한다. 세 개까지 왼쪽에서 오른쪽으로 겹치고, 초과분은 맨 오른쪽의 별도 원에 `+N`으로 표시한다. 펼치면 아바타·제목·provider·상태 목록에서 각 스레드를 연다. Agentation은 원래 카드의 피드백 아이콘과 개수로 압축하고, 펼치면 본문과 위치·대상을 표시한다. 전체 전송·삭제는 목록 아래에 두고 개별 액션도 유지한다.

검증: `npm ci`, `npm test`, `npm run typecheck`, `bb plugin build`.

## related

| plugin | role |
| --- | --- |
| `sidebar` | open/close depth motion |
| `bb-thread-theme` | thread list look and row chrome |
| `bb-ribbon` | icon ribbon navigation |

## license

MIT. See [LICENSE](LICENSE).

정보 필·원 버튼·팝오버·상세 버튼은 컴포저와 같은 테마 기반 glass 표면을 쓴다. 채팅·sidebar 배경의 색조와 라이트·다크 투명도를 함께 따르고, 주변 버튼과 같은 블러·부드러운 하이라이트를 적용한다. Diff 상세에는 실제 파일별 추가/삭제 줄 수와 비교 기준, 기준 브랜치 대비 커밋 목록도 표시하며, 열린 상태에서도 갱신한다. 미푸시 여부는 만들지 않는다.

`정보가 없어도 상단 아이콘 표시` 토글은 기본 꺼짐이다. 켜면 `상단 표시`로 선택한 빈 항목도 작은 아이콘으로 남기며, 클릭하면 현재 정보가 없음을 보여 준다. `목록에만 표시`와 `끄기` 항목은 상단에 추가하지 않는다. 실제 정보가 생기면 원래 요약으로 전환한다.
