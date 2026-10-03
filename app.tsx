import { definePluginApp } from "@get-bb/plugin-sdk/app";

import { QuoteMentionBridge } from "./lib/quote-bridge";
import { injectQuoteMentions } from "./lib/quote-mention";
import { injectQuotePill } from "./lib/quote-pill";
import { injectSendHaptic } from "./lib/send-haptic";
import { injectThreadToc } from "./lib/thread-toc";
import { injectWorkspaceDiffPill } from "./lib/workspace-diff-pill";

export default definePluginApp((app) => {
  app.composer.customize({
    id: "quote-mention",
    banners: [{ id: "convert", chrome: "bare", component: QuoteMentionBridge }],
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
});
