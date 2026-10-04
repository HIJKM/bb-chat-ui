import assert from "node:assert/strict";
import test from "node:test";

import { userAttachmentsCss } from "./user-attachments.ts";

const USER_BUBBLE =
  String.raw`\[data-message-column\] > \.group\\/message\.ml-auto > \.flex > \.rounded-xl:has\(> \.mt-2\.space-y-2\)`;

test("lifts user photos and files above the message bubble", () => {
  const css = userAttachmentsCss();
  assert.match(css, new RegExp(`${USER_BUBBLE}\\s*\\{[^}]*display:\\s*contents;`));
  assert.match(
    css,
    new RegExp(`${USER_BUBBLE} > \\.mt-2\\.space-y-2\\s*\\{[^}]*display:\\s*contents;`),
  );
  assert.match(
    css,
    new RegExp(
      `${USER_BUBBLE} > \\.mt-2\\.space-y-2 > \\.flex\\s*\\{[^}]*order:\\s*-1;`,
    ),
  );
  assert.match(
    css,
    new RegExp(
      `${USER_BUBBLE} > \\.mt-2\\.space-y-2 > \\.flex:last-child\\s*\\{[^}]*margin-bottom:\\s*8px;`,
    ),
  );
  assert.match(
    css,
    new RegExp(
      `${USER_BUBBLE} > \\.break-words\\s*\\{[^}]*background:\\s*var\\(--surface-recessed\\);`,
    ),
  );
  assert.match(
    css,
    new RegExp(
      `${USER_BUBBLE} > \\.break-words\\s*\\{[^}]*border:\\s*1px solid var\\(--border-seam\\);`,
    ),
  );
  assert.match(
    css,
    new RegExp(
      `${USER_BUBBLE} > \\.break-words\\s*\\{[^}]*border-radius:\\s*calc\\(var\\(--radius\\) \\+ 4px\\);`,
    ),
  );
  assert.match(
    css,
    new RegExp(
      `${USER_BUBBLE} > \\.break-words\\s*\\{[^}]*padding:\\s*0\\.625rem 1rem;`,
    ),
  );
  assert.match(
    css,
    new RegExp(`${USER_BUBBLE}:not\\(:has\\(> \\.break-words\\)\\) > p\\s*\\{[^}]*display:\\s*none;`),
  );
  assert.match(
    css,
    new RegExp(`${USER_BUBBLE}:has\\(> \\.mt-1\\) > \\.break-words\\s*\\{[^}]*padding-bottom:\\s*1\\.75rem;`),
  );
  assert.match(
    css,
    new RegExp(`${USER_BUBBLE} > \\.mt-1\\s*\\{[^}]*margin-top:\\s*-1\\.5rem;`),
  );
  assert.match(
    css,
    new RegExp(
      `${USER_BUBBLE} > \\.break-words\\[style\\*="mask-image"\\]\\s*\\{[^}]*mask-image:\\s*none !important;`,
    ),
  );
  assert.doesNotMatch(css, /var\(--radius-xl\)/);
  assert.doesNotMatch(css, /width < 48rem/);
});

test("thickens user file chips and paints a file icon", () => {
  const css = userAttachmentsCss();
  const chip = `${USER_BUBBLE} > \\.mt-2\\.space-y-2 > \\.flex:not\\(:has\\(img\\)\\) > :is\\(a, button, span\\)`;
  assert.match(css, new RegExp(`${chip}\\s*\\{[^}]*min-height:\\s*64px;`));
  assert.match(css, new RegExp(`${chip}\\s*\\{[^}]*border-radius:\\s*20px;`));
  assert.match(
    css,
    new RegExp(`${chip}\\s*\\{[^}]*padding:\\s*6px 14px 6px 12px;`),
  );
  assert.match(css, new RegExp(`${chip}\\s*\\{[^}]*gap:\\s*6px;`));
  assert.match(css, new RegExp(`${chip}::before\\s*\\{[^}]*width:\\s*28px;`));
  assert.match(css, new RegExp(`${chip}::before\\s*\\{[^}]*height:\\s*28px;`));
  assert.match(css, new RegExp(`${chip}::before\\s*\\{[^}]*mask:`));
});
