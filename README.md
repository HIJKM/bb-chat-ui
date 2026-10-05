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

## related

| plugin | role |
| --- | --- |
| `sidebar` | open/close depth motion |
| `bb-thread-theme` | thread list look and row chrome |
| `bb-ribbon` | icon ribbon navigation |

## license

MIT. See [LICENSE](LICENSE).
