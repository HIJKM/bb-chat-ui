import { definePluginApp } from "@get-bb/plugin-sdk/app";

import { injectWorkspaceDiffPill } from "./lib/workspace-diff-pill";

export default definePluginApp((app) => {
  app.contentScripts.register({
    id: "workspace-diff-pill",
    mount() {
      return injectWorkspaceDiffPill(document);
    },
  });
});
