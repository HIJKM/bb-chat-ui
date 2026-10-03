import { quoteLabel } from "./quote-text.ts";

export interface QuoteSpan {
  start: number;
  end: number;
  raw: string;
  body: string;
  label: string;
}

interface Ranged {
  from: number;
  to: number;
}

export function firstQuoteSpan(
  text: string,
  mentions: readonly Ranged[] = [],
  position: "first" | "last" = "first",
): QuoteSpan | null {
  const lines = linesOf(text);
  let index = 0;
  let found: QuoteSpan | null = null;
  while (index < lines.length) {
    const line = lines[index];
    if (!line || !isQuoteLine(line.text) || overlaps(line, mentions)) {
      index += 1;
      continue;
    }
    let endIndex = index + 1;
    while (endIndex < lines.length) {
      const next = lines[endIndex];
      if (!next || !isQuoteLine(next.text) || overlaps(next, mentions)) break;
      endIndex += 1;
    }
    const start = line.start;
    const end = lines[endIndex - 1]?.end ?? line.end;
    const raw = text.slice(start, end);
    const body = raw
      .split("\n")
      .map(stripQuotePrefix)
      .join("\n")
      .trim();
    const label = quoteLabel(body);
    if (label) {
      found = { start, end, raw, body, label };
      if (position === "first") return found;
    }
    index = endIndex;
  }
  return found;
}

export function replaceQuoteSpan<T extends Ranged>(
  draft: { text: string; mentions: readonly T[] },
  span: QuoteSpan,
  mention: T,
): { text: string; mentions: T[] } | null {
  if (draft.text.slice(span.start, span.end) !== span.raw) return null;
  if (mention.from !== span.start || mention.to !== span.start + span.label.length) {
    return null;
  }
  const nextMentions: T[] = [];
  const delta = span.label.length - (span.end - span.start);
  for (const current of draft.mentions) {
    if (current.to <= span.start) {
      nextMentions.push(current);
      continue;
    }
    if (current.from >= span.end) {
      nextMentions.push({
        ...current,
        from: current.from + delta,
        to: current.to + delta,
      });
      continue;
    }
    return null;
  }
  nextMentions.push(mention);
  nextMentions.sort((left, right) => left.from - right.from || left.to - right.to);
  return {
    text: draft.text.slice(0, span.start) + span.label + draft.text.slice(span.end),
    mentions: nextMentions,
  };
}

function linesOf(text: string): { text: string; start: number; end: number }[] {
  const lines: { text: string; start: number; end: number }[] = [];
  let start = 0;
  for (let index = 0; index <= text.length; index += 1) {
    if (index !== text.length && text[index] !== "\n") continue;
    lines.push({ text: text.slice(start, index), start, end: index });
    start = index + 1;
  }
  return lines;
}

function isQuoteLine(line: string): boolean {
  return line === ">" || line.startsWith("> ");
}

function stripQuotePrefix(line: string): string {
  if (line.startsWith("> ")) return line.slice(2);
  if (line === ">") return "";
  return line;
}

function overlaps(
  line: { start: number; end: number },
  mentions: readonly Ranged[],
): boolean {
  return mentions.some((mention) => line.start < mention.to && line.end > mention.from);
}
