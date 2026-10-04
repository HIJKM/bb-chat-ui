interface Ranged {
  from: number;
  to: number;
}

interface Draft<T extends Ranged> {
  text: string;
  mentions: readonly T[];
}

interface GapEdit {
  from: number;
  to: number;
  text: string;
}

function replaceGaps<T extends Ranged>(draft: Draft<T>, edits: GapEdit[]): Draft<T> {
  let text = draft.text;
  for (const edit of [...edits].sort((a, b) => b.from - a.from)) {
    text = text.slice(0, edit.from) + edit.text + text.slice(edit.to);
  }
  const shift = (pos: number) => pos + edits.reduce((delta, edit) =>
    delta + (edit.to <= pos ? edit.text.length - (edit.to - edit.from) : 0), 0);
  return {
    text,
    mentions: draft.mentions.map((mention) => ({
      ...mention, from: shift(mention.from), to: shift(mention.to),
    })),
  };
}

// Limit normalization to newly inserted pills and their whitespace separators.
export function inlineInsertedMentions<T extends Ranged>(
  before: Draft<T>,
  after: Draft<T>,
): Draft<T> | null {
  let from = 0;
  while (from < before.text.length && from < after.text.length &&
         before.text[from] === after.text[from]) from += 1;
  let oldTo = before.text.length;
  let to = after.text.length;
  while (oldTo > from && to > from && before.text[oldTo - 1] === after.text[to - 1]) {
    oldTo -= 1;
    to -= 1;
  }
  if (oldTo !== from) return null;
  const inserted = after.mentions
    .filter((mention) => mention.from >= from && mention.to <= to)
    .sort((a, b) => a.from - b.from);
  if (inserted.length === 0) return null;
  const edits: GapEdit[] = [];
  let cursor = from;
  for (const mention of [...inserted, { from: to, to }]) {
    const gap = after.text.slice(cursor, mention.from);
    if (gap.trim() !== "") return null;
    if (/[\r\n]/.test(gap)) {
      edits.push({ from: cursor, to: mention.from, text: cursor === 0 ? "" : " " });
    }
    cursor = mention.to;
  }
  return edits.length > 0 ? replaceGaps(after, edits) : null;
}

// Add-to-chat wraps a quote with one automatic line break on each side.
export function inlineQuoteMention<T extends Ranged>(draft: Draft<T>, mention: T): Draft<T> {
  const edits: GapEdit[] = [];
  if (draft.text[mention.from - 1] === "\n") {
    edits.push({ from: mention.from - 1, to: mention.from, text: mention.from === 1 ? "" : " " });
  }
  if (draft.text[mention.to] === "\n") {
    edits.push({ from: mention.to, to: mention.to + 1, text: " " });
  }
  return edits.length > 0 ? replaceGaps(draft, edits) : draft;
}
