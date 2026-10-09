import { definePluginApp } from "@get-bb/plugin-sdk/app";
import { Fragment, createElement } from "react";

import { DeviceChromeBridge } from "./lib/device-chrome";
import { QuoteMentionBridge } from "./lib/quote-bridge";
import { injectComposerGlass } from "./lib/composer-glass";
import { injectQuoteMentions } from "./lib/quote-mention";
import { injectQuotePill } from "./lib/quote-pill";
import { injectMentionPills } from "./lib/mention-pill";
import { injectSendHaptic } from "./lib/send-haptic";
import { injectQueuedMessages } from "./lib/queued-messages";
import { injectThreadToc } from "./lib/thread-toc";
import { injectUserAttachments } from "./lib/user-attachments";
import { injectWorkspaceDiffPill } from "./lib/workspace-diff-pill";
import { WorkspaceDiffBridge } from "./lib/workspace-diff-bridge";
import { ComposerInfoBridge } from "./lib/composer-info-bridge";
import { injectComposerInfo } from "./lib/composer-info";
import { infoSettingsNotice } from "./lib/composer-info-settings";

function ComposerBridges() {
  return createElement(Fragment, null,
    createElement(DeviceChromeBridge), createElement(QuoteMentionBridge), createElement(WorkspaceDiffBridge), createElement(ComposerInfoBridge));
}

export default definePluginApp((app) => {
  app.slots.settingsSection({
    id:"composer-info",
    title:"컴포저 위 정보",
    component:() => createElement("p", { className:"text-sm text-subtle-foreground" }, infoSettingsNotice),
  });
  app.composer.customize({
    id: "quote-mention",
    banners: [{ id: "convert", chrome: "bare", component: ComposerBridges }],
  });
  app.contentScripts.register({
    id: "workspace-diff-pill",
    mount() {
      return injectWorkspaceDiffPill(document);
    },
  });
  app.contentScripts.register({
    id: "quote-pill",
    mount() {
      const stopPill = injectQuotePill(document);
      const stopMention = injectQuoteMentions(document);
      return () => {
        stopPill();
        stopMention();
      };
    },
  });
  app.contentScripts.register({
    id: "composer-glass",
    mount() {
      return injectComposerGlass(document);
    },
  });
  app.contentScripts.register({
    id: "mention-pills",
    mount() {
      return injectMentionPills(document);
    },
  });
  app.contentScripts.register({
    id: "send-haptic",
    mount() {
      return injectSendHaptic(document);
    },
  });
  app.contentScripts.register({
    id: "thread-toc",
    mount() {
      return injectThreadToc(document);
    },
  });
  app.contentScripts.register({
    id: "user-attachments",
    mount() {
      return injectUserAttachments(document);
    },
  });
  app.contentScripts.register({
    id: "queued-messages",
    mount() {
      return injectQueuedMessages(document);
    },
  });
  app.contentScripts.register({
    id:"composer-info",
    mount() { return injectComposerInfo(document); },
  });
});
