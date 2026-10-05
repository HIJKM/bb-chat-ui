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

표면색은 현재 BB 테마의 `--background`, `--sidebar`, `--popover`, `--foreground`를 따른다. 고정 캔버스를 덮어쓰지 않고 glass의 투명도, blur, 그림자, 모션을 유지한다. 다른 플러그인의 색 변수나 설정에 의존하지 않는다.

## related

| plugin | role |
| --- | --- |
| `sidebar` | open/close depth motion |
| `bb-thread-theme` | thread list look and row chrome |
| `bb-ribbon` | icon ribbon navigation |

## license

MIT. See [LICENSE](LICENSE).
