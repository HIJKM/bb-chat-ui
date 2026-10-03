import {
  defineRpcContract,
  type StandardSchemaV1,
  type StandardSchemaV1Result,
} from "@get-bb/plugin-sdk";

const QUOTE_TEXT_MAX = 100_000;

export interface SavedQuote {
  id: string;
  text: string;
}

function schema<T>(
  validate: (value: unknown) => StandardSchemaV1Result<T>,
): StandardSchemaV1<T> {
  return {
    "~standard": {
      version: 1,
      vendor: "bb-chat-ui",
      validate,
    },
  };
}

function issue(message: string): StandardSchemaV1Result<never> {
  return { issues: [{ message }] };
}

const saveQuoteInput = schema<SavedQuote>((value) => {
  if (typeof value !== "object" || value === null) return issue("object");
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(record.id)) {
    return issue("id");
  }
  if (
    typeof record.text !== "string" ||
    record.text.trim().length === 0 ||
    record.text.length > QUOTE_TEXT_MAX
  ) {
    return issue("text");
  }
  return { value: { id: record.id, text: record.text } };
});

const saveQuoteOutput = schema<{ saved: true }>((value) => {
  if (
    typeof value === "object" &&
    value !== null &&
    (value as { saved?: unknown }).saved === true
  ) {
    return { value: { saved: true } };
  }
  return issue("saved");
});

export const quoteRpcContract = defineRpcContract({
  saveQuote: {
    input: saveQuoteInput,
    output: saveQuoteOutput,
  },
});
