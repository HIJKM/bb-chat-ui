---
name: bb-chat-ui
description: 채팅 메시지와 컴포저 UI. 사이드바 모션은 bb-motion, 스레드 목록 테마는 bb-thread-theme가 맡는다.
---

# bb-chat-ui

채팅 표면만 담당한다. 메시지 본문, 메시지 액션, 컴포저다.

컴포저 위 변경 요약은 호스트의 `thread-prompt-banner-git-toggle`이다. 이 플러그인은 그 버튼을 필로 바꾼다. 내용은 아이콘, 줄 수, `·`, 파일 수다. 펼치기는 숨긴다. 클릭은 옆 패널의 Diff 탭을 연다.

사이드바 패널 모션은 `bb-motion`이다. 스레드 목록의 색과 행 표시는 `bb-thread-theme`다.

화면을 바꾸는 등록은 `app.tsx`에 둔다. 서버 동작이 필요해지기 전에는 `server.ts`를 비워 둔다.
