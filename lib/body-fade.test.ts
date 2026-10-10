import test from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { inflateSync } from "node:zlib";
import ts from "typescript";
import { composerInfoCss } from "./composer-info.ts";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function bodyFadeBrowserScript(): string {
  const source = readFileSync(new URL("./body-fade.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  }).outputText;
  return `${compiled.replaceAll(/export function (\w+)/g, "globalThis.$1 = function")}\ntrue`;
}

function pageHtml(): string {
  const lines = Array.from({ length: 40 }, (_, index) => `<div>Plan line ${index + 1} stays readable under the edge.</div>`).join("");
  const command = Array.from({ length: 30 }, (_, index) => `echo line ${index + 1}`).join("\n");
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  :root {
    --background: oklch(0.93 0.03 250);
    --bb-chat-ui-glass-base: var(--background);
    --popover: oklch(0.98 0.01 250);
    --foreground: oklch(0.25 0.03 250);
    --ink: var(--foreground);
  }
  html.dark {
    --background: oklch(0.22 0.03 255);
    --bb-chat-ui-glass-base: var(--background);
    --popover: oklch(0.28 0.02 255);
    --foreground: oklch(0.92 0.02 250);
    --ink: var(--foreground);
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--background); }
  #column { width: 390px; }
  .banner {
    display: flex; flex-direction: column; min-width: 0; max-width: 100%;
    overflow: hidden; border: 1px solid oklch(0.7 0.02 250); border-radius: 8px;
    margin: 8px 0; font: 14px/1.4 sans-serif;
  }
  .header {
    display: flex; align-items: flex-start; flex-shrink: 0; min-height: 36px;
    padding: 6px 6px 6px 12px; border-bottom: 1px solid oklch(0.75 0.02 250);
  }
  .header span { display: block; min-width: 0; font-weight: 600; white-space: normal; }
  .body-clip { min-height: 0; overflow-y: auto; padding: 10px 12px 12px; }
  #clip .body-clip { max-height: min(32rem, 50dvh); }
  .request, .preview { overflow: hidden; border-radius: 8px; border: 1px solid oklch(0.7 0.02 250); background: white; }
  .scroller { max-height: 288px; overflow: auto; padding: 8px 12px; }
  pre.scroller { margin: 0; white-space: pre-wrap; font: 12px/1.6 ui-monospace, monospace; }
  #glass { height: 80px; margin: 8px 0; }
  #one, #two, #two div { width: 48px; height: 48px; background: var(--bb-chat-ui-info-face); }
  #two div { width: 100%; height: 100%; }
  .swatches { display: flex; gap: 8px; }
  ${composerInfoCss}
</style>
</head>
<body>
<span hidden id="chrome" data-bb-chat-ui-device="phone" data-bb-chat-ui-orientation="portrait" data-bb-chat-ui-viewport="narrow" data-bb-chat-ui-hit-target="large"></span>
<div id="column">
  <div data-promptbox-shell>
    <div class="grid" data-bb-chat-ui-info-stack id="stack">
      <div class="swatches"><div id="one"></div><div id="two"><div></div></div></div>
      <section id="glass" data-testid="plan-review-banner"></section>
      <span id="color-fade" data-bb-chat-ui-info-body-fade="below" aria-hidden="true"></span>
      <section id="clip" data-testid="plan-review-banner" data-expanded class="banner" style="max-height:200px">
        <div class="header"><span>Plan review title wraps on a narrow phone so the section header grows and the body edge moves down away from the card top</span></div>
        <div class="body-clip" id="clip-outer">
          <div data-testid="plan-review-request" class="request">
            <div class="overflow-auto scroller" id="clip-scroll">${lines}</div>
          </div>
        </div>
      </section>
      <section id="fit" data-testid="plan-review-banner" data-expanded class="banner">
        <div class="header"><span>Full plan</span></div>
        <div class="body-clip">
          <div data-testid="plan-review-request" class="request">
            <div class="overflow-auto scroller" id="fit-scroll">${lines}</div>
          </div>
        </div>
      </section>
      <section id="approval" data-testid="approval-banner" data-expanded class="banner">
        <div class="header"><span>Approval needed</span></div>
        <div class="body-clip">
          <div data-testid="command-preview" class="preview">
            <pre class="overflow-auto scroller" id="approval-scroll">${command}</pre>
          </div>
        </div>
      </section>
    </div>
  </div>
</div>
<script>
function placeCurrent(scroller) {
  const stack = document.querySelector("#stack");
  const anchor = stack.getBoundingClientRect();
  const rect = scroller.getBoundingClientRect();
  const overflow = scroller.scrollHeight <= scroller.clientHeight + 1
    ? { above: false, below: false }
    : {
      above: scroller.scrollTop > 1,
      below: scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 1,
    };
  const frame = bodyFadeBox({
    anchorTop: anchor.top,
    anchorLeft: anchor.left,
    scroller: { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left },
    clips: readBodyFadeClips(scroller),
    overflow,
    moving: false,
  });
  const make = (edge, box) => {
    const node = document.createElement("span");
    node.setAttribute("data-bb-chat-ui-info-body-fade", edge);
    node.setAttribute("aria-hidden", "true");
    node.hidden = !box.show;
    node.style.left = box.left + "px";
    node.style.width = box.width + "px";
    node.style.height = box.height + "px";
    node.style.top = box.top + "px";
    stack.append(node);
    return node;
  };
  return { above: make("above", frame.above), below: make("below", frame.below) };
}
window.measure = (mode) => {
  const clip = document.querySelector("#clip-scroll");
  const outer = document.querySelector("#clip-outer");
  const fit = document.querySelector("#fit-scroll");
  const approval = document.querySelector("#approval-scroll");
  clip.scrollTop = 0; outer.scrollTop = 0; fit.scrollTop = 0; approval.scrollTop = 0;
  if (mode === "mid") {
    clip.scrollTop = 80; fit.scrollTop = 80; approval.scrollTop = 80;
    outer.scrollTop = Math.max(0, (outer.scrollHeight - outer.clientHeight) / 2);
  }
  if (mode === "end") {
    clip.scrollTop = clip.scrollHeight;
    fit.scrollTop = fit.scrollHeight;
    approval.scrollTop = approval.scrollHeight;
  }
  document.querySelectorAll("[data-bb-chat-ui-info-body-fade]:not(#color-fade)").forEach(node => node.remove());
  const placed = { clip: placeCurrent(clip), fit: placeCurrent(fit), approval: placeCurrent(approval) };
  const stack = document.querySelector("#stack").getBoundingClientRect();
  const glass = document.querySelector("#glass").getBoundingClientRect();
  const color = document.querySelector("#color-fade");
  color.hidden = false;
  color.style.left = (glass.left - stack.left) + "px";
  color.style.width = glass.width + "px";
  color.style.height = "24px";
  color.style.top = (glass.bottom - 24 - stack.top) + "px";
  const colorBox = color.getBoundingClientRect();
  const card = document.querySelector("#clip").getBoundingClientRect();
  const cardCss = getComputedStyle(document.querySelector("#clip"));
  const fadeCss = getComputedStyle(color);
  const edge = (scroller, pair) => {
    const scrollerBox = scroller.getBoundingClientRect();
    const belowBox = pair.below.hidden ? null : pair.below.getBoundingClientRect();
    const aboveBox = pair.above.hidden ? null : pair.above.getBoundingClientRect();
    return {
      scrollerTop: scrollerBox.top, scrollerBottom: scrollerBox.bottom, scrollerHeight: scrollerBox.height,
      belowHidden: pair.below.hidden, aboveHidden: pair.above.hidden,
      fadeTop: aboveBox ? aboveBox.top : null, fadeBottom: belowBox ? belowBox.bottom : null,
      fadeHeight: belowBox ? belowBox.height : aboveBox ? aboveBox.height : null,
    };
  };
  return {
    mode,
    viewport: { innerWidth, innerHeight, dpr: devicePixelRatio },
    columnWidth: document.querySelector("#column").getBoundingClientRect().width,
    device: document.querySelector("#chrome").dataset.bbChatUiDevice,
    viewportName: document.querySelector("#chrome").dataset.bbChatUiViewport,
    headerHeight: document.querySelector("#clip .header").getBoundingClientRect().height,
    clipBottom: card.bottom - (parseFloat(cardCss.borderBottomWidth) || 0),
    clipTop: card.top + (parseFloat(cardCss.borderTopWidth) || 0),
    clip: edge(clip, placed.clip),
    fit: edge(fit, placed.fit),
    approval: edge(approval, placed.approval),
    color: {
      glass: glass.toJSON(), fade: colorBox.toJSON(),
      one: document.querySelector("#one").getBoundingClientRect().toJSON(),
      two: document.querySelector("#two").getBoundingClientRect().toJSON(),
      backdrop: fadeCss.backdropFilter, mask: fadeCss.maskImage,
    },
  };
};
</script>
</body>
</html>`;
}

function decodePng(buffer: Buffer) {
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat: Buffer[] = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    offset += 4;
    const type = buffer.toString("ascii", offset, offset + 4);
    offset += 4;
    const data = buffer.subarray(offset, offset + length);
    offset += length + 4;
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
  }
  const channels = colorType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const rows: Buffer[] = [];
  let cursor = 0;
  const paeth = (left: number, up: number, upLeft: number) => {
    const guess = left + up - upLeft;
    const leftDistance = Math.abs(guess - left);
    const upDistance = Math.abs(guess - up);
    const diagonal = Math.abs(guess - upLeft);
    return leftDistance <= upDistance && leftDistance <= diagonal ? left : upDistance <= diagonal ? up : upLeft;
  };
  for (let y = 0; y < height; y += 1) {
    const filter = raw[cursor];
    cursor += 1;
    const row = Buffer.alloc(stride);
    for (let index = 0; index < stride; index += 1) {
      const left = index >= channels ? row[index - channels] : 0;
      const up = y > 0 ? rows[y - 1][index] : 0;
      const upLeft = y > 0 && index >= channels ? rows[y - 1][index - channels] : 0;
      const value = raw[cursor + index];
      if (filter === 0) row[index] = value;
      else if (filter === 1) row[index] = (value + left) & 255;
      else if (filter === 2) row[index] = (value + up) & 255;
      else if (filter === 3) row[index] = (value + Math.floor((left + up) / 2)) & 255;
      else row[index] = (value + paeth(left, up, upLeft)) & 255;
    }
    cursor += stride;
    rows.push(row);
  }
  return {
    width,
    height,
    pixel(x: number, y: number) {
      const row = rows[Math.max(0, Math.min(height - 1, y))];
      const index = Math.max(0, Math.min(width - 1, x)) * channels;
      return [row[index], row[index + 1], row[index + 2]];
    },
  };
}

type Cdp = { id?: number; method?: string; params?: unknown; result?: unknown; error?: { message: string }; sessionId?: string };

test("plan and approval body fades match the card edge and brightness", { timeout: 60_000 }, async () => {
  const directory = mkdtempSync(join(tmpdir(), "bb-body-fade-"));
  const htmlPath = join(directory, "fade.html");
  writeFileSync(htmlPath, pageHtml());
  const chrome = spawn(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--force-device-scale-factor=1",
    "--no-first-run",
    "--no-default-browser-check",
    `--user-data-dir=${directory}/profile`,
    "--remote-debugging-port=0",
    "--window-size=1280,800",
  ], { stdio: ["ignore", "pipe", "pipe"] });
  try {
    const socket = await waitForDebugger(chrome);
    const result = await measurePage(socket, pathToFileURL(htmlPath).href);
    assert.equal(result.viewport.innerWidth, 1280, `layout viewport width is ${result.viewport.innerWidth}`);
    assert.equal(result.viewport.innerHeight, 800, `layout viewport height is ${result.viewport.innerHeight}`);
    assert.equal(result.viewport.dpr, 1, `devicePixelRatio is ${result.viewport.dpr}`);
    assert.equal(result.light.width, result.viewport.innerWidth, `screenshot width is ${result.light.width}`);
    assert.equal(result.device, "phone");
    assert.equal(result.viewportName, "narrow");
    assert.ok(Math.abs(result.columnWidth - 390) < 1, `narrow column width is ${result.columnWidth}`);
    const problems: string[] = [];
    if (!(result.headerHeight > 64)) problems.push(`narrow header height is ${result.headerHeight}, so the title did not wrap`);
    for (const theme of ["light", "dark"] as const) {
      const shot = result[theme];
      const brighter = (name: string, sample: number[], base: number[]) => sample.some((channel, index) => channel > base[index] + 2);
      if (!brighter("two", shot.two, shot.one)) problems.push(`${theme} two-layer swatch ${shot.two} is not brighter than one layer ${shot.one}`);
      if (brighter("fade", shot.fade, shot.card)) problems.push(`${theme} fade solid ${shot.fade} is brighter than the card ${shot.card}`);
      if (!/blur\(5px\)/.test(result.backdrop)) problems.push(`backdrop is ${result.backdrop}`);
      if (!/linear-gradient/.test(result.mask)) problems.push(`mask is ${result.mask}`);
    }
    for (const row of result.rows) {
      if (row.mode === "top" && row.kind === "clip") {
        if (!(row.scrollerBottom > row.clipBottom + 1)) problems.push(`clip fixture scroller bottom ${row.scrollerBottom} is not past the card edge ${row.clipBottom}`);
        if (row.belowHidden || row.fadeBottom == null || Math.abs(row.fadeBottom - row.clipBottom) > 0.5) {
          problems.push(`scroll top below fade bottom ${row.fadeBottom} hidden ${row.belowHidden} visible ${row.clipBottom}`);
        }
      }
      if (row.mode === "end" && row.kind === "clip") {
        if (row.belowHidden || row.fadeBottom == null || Math.abs(row.fadeBottom - row.clipBottom) > 0.5) {
          problems.push(`inner scroll end below fade bottom ${row.fadeBottom} hidden ${row.belowHidden} visible ${row.clipBottom}`);
        }
      }
      if (row.mode === "mid" && row.kind === "clip") {
        if (row.belowHidden || row.fadeBottom == null || Math.abs(row.fadeBottom - row.clipBottom) > 0.5) {
          problems.push(`mid scroll below fade bottom ${row.fadeBottom} hidden ${row.belowHidden} visible ${row.clipBottom}`);
        }
      }
      if (row.mode === "top" && (row.kind === "fit" || row.kind === "approval")) {
        if (row.belowHidden || row.fadeBottom == null || Math.abs(row.fadeBottom - row.scrollerBottom) > 0.5) {
          problems.push(`${row.kind} unclipped fade bottom ${row.fadeBottom} scroller ${row.scrollerBottom} hidden ${row.belowHidden}`);
        }
      }
    }
    assert.deepEqual(problems, []);
  } finally {
    if (chrome.exitCode == null && chrome.signalCode == null) {
      chrome.kill();
      await new Promise(resolve => {
        const timer = setTimeout(() => { chrome.kill("SIGKILL"); resolve(undefined); }, 2_000);
        chrome.once("exit", () => { clearTimeout(timer); resolve(undefined); });
      });
    }
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        rmSync(directory, { recursive: true, force: true });
        break;
      } catch {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }
});

function waitForDebugger(chrome: ChildProcess) {
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("chrome did not open a debugging port")), 15_000);
    let text = "";
    const onData = (chunk: Buffer) => {
      text += chunk.toString();
      const match = text.match(/ws:\/\/127\.0\.0\.1:\d+\/devtools\/browser\/\S+/);
      if (!match) return;
      clearTimeout(timer);
      resolve(match[0]);
    };
    chrome.stderr?.on("data", onData);
    chrome.stdout?.on("data", onData);
    chrome.once("exit", code => {
      clearTimeout(timer);
      reject(new Error(`chrome exited ${code} before the debugging port opened`));
    });
  });
}

async function measurePage(socketUrl: string, url: string) {
  const ws = new WebSocket(socketUrl);
  await new Promise<void>((resolve, reject) => { ws.onopen = () => resolve(); ws.onerror = () => reject(new Error("debugger socket failed")); });
  let next = 0;
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  const events: Cdp[] = [];
  ws.onmessage = event => {
    const message = JSON.parse(String(event.data)) as Cdp;
    if (message.id && pending.has(message.id)) {
      const waiter = pending.get(message.id)!;
      pending.delete(message.id);
      if (message.error) waiter.reject(new Error(message.error.message));
      else waiter.resolve(message.result);
    } else events.push(message);
  };
  const send = (method: string, params: Record<string, unknown> = {}, sessionId?: string) => new Promise<unknown>((resolve, reject) => {
    const id = ++next;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
  try {
    const created = await send("Target.createTarget", { url: "about:blank" }) as { targetId: string };
    const attached = await send("Target.attachToTarget", { targetId: created.targetId, flatten: true }) as { sessionId: string };
    const sessionId = attached.sessionId;
    await send("Page.enable", {}, sessionId);
    await send("Runtime.enable", {}, sessionId);
    await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }, sessionId);
    events.length = 0;
    await send("Page.navigate", { url }, sessionId);
    const started = Date.now();
    while (!events.some(event => event.method === "Page.loadEventFired" && event.sessionId === sessionId)) {
      if (Date.now() - started > 8_000) throw new Error("page did not load");
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    const installed = await send("Runtime.evaluate", { expression: bodyFadeBrowserScript(), returnByValue: true }, sessionId) as { exceptionDetails?: { text: string } };
    if (installed.exceptionDetails) throw new Error(installed.exceptionDetails.text);
    const read = async (mode: string) => {
      const evaluated = await send("Runtime.evaluate", {
        expression: `window.measure(${JSON.stringify(mode)})`,
        returnByValue: true,
      }, sessionId) as { result?: { value?: Measure } };
      if (!evaluated.result?.value) throw new Error(`measure ${mode} returned no value`);
      return evaluated.result.value;
    };
    const rows = [];
    let latest: Measure | null = null;
    for (const mode of ["top", "mid", "end"]) {
      latest = await read(mode);
      for (const kind of ["clip", "fit", "approval"] as const) {
        const edge = latest[kind];
        rows.push({ mode, kind, clipBottom: latest.clipBottom, ...edge });
      }
    }
    if (!latest) throw new Error("no measurement");
    const shoot = async () => {
      const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }, sessionId) as { data: string };
      return decodePng(Buffer.from(shot.data, "base64"));
    };
    const light = colorSample(await shoot(), latest);
    await send("Runtime.evaluate", { expression: `document.documentElement.classList.add("dark"); true`, returnByValue: true }, sessionId);
    const darkMeasure = await read("end");
    const dark = colorSample(await shoot(), darkMeasure);
    return {
      viewport: latest.viewport,
      device: latest.device,
      viewportName: latest.viewportName,
      columnWidth: latest.columnWidth,
      headerHeight: latest.headerHeight,
      backdrop: latest.color.backdrop,
      mask: latest.color.mask,
      rows,
      light,
      dark,
    };
  } finally { ws.close(); }
}

type Box = { x: number; y: number; width: number; height: number };
type Edge = {
  scrollerTop: number; scrollerBottom: number; scrollerHeight: number;
  belowHidden: boolean; aboveHidden: boolean;
  fadeTop: number | null; fadeBottom: number | null; fadeHeight: number | null;
};
type Measure = {
  mode: string;
  viewport: { innerWidth: number; innerHeight: number; dpr: number };
  columnWidth: number;
  device: string;
  viewportName: string;
  headerHeight: number;
  clipBottom: number;
  clipTop: number;
  clip: Edge;
  fit: Edge;
  approval: Edge;
  color: { glass: Box; fade: Box; one: Box; two: Box; backdrop: string; mask: string };
};

function colorSample(png: ReturnType<typeof decodePng>, measure: Measure) {
  const at = (box: Box, dx: number, dy: number) => {
    const x = Math.round(box.x + dx);
    const y = Math.round(box.y + dy);
    if (x < 0 || y < 0 || x >= png.width || y >= png.height) {
      throw new Error(`sample ${x},${y} is outside the ${png.width}x${png.height} screenshot`);
    }
    return png.pixel(x, y);
  };
  return {
    width: png.width,
    height: png.height,
    one: at(measure.color.one, measure.color.one.width / 2, measure.color.one.height / 2),
    two: at(measure.color.two, measure.color.two.width / 2, measure.color.two.height / 2),
    card: at(measure.color.glass, measure.color.glass.width / 2, 16),
    fade: at(measure.color.fade, measure.color.fade.width / 2, measure.color.fade.height - 2),
  };
}
