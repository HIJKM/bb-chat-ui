import { definePluginApp } from "@get-bb/plugin-sdk/app";

import { injectThreadToc } from "./lib/thread-toc";
import { injectWorkspaceDiffPill } from "./lib/workspace-diff-pill";

export default definePluginApp((app) => {
  app.contentScripts.register({
    id: "workspace-diff-pill",
    mount() {
      return injectWorkspaceDiffPill(document);
    },
  });
  app.contentScripts.register({
    id: "thread-toc",
    mount() {
      return injectThreadToc(document);
    },
  });
});
