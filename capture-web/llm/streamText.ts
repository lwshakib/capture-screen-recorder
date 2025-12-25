import {
  streamText as _streamText,
  convertToModelMessages,
  StreamTextOnFinishCallback,
  Tool,
} from "ai";
import { GeminiModel } from "./model";
import { SYSTEM_PROMPT } from "./prompt";

interface ToolResult<Name extends string, Args, Result> {
  toolCallId: string;
  toolName: Name;
  args: Args;
  result: Result;
}

interface Message {
  role: "user" | "assistant";
  parts: { type: string; text: string }[];
}

export type Messages = Message[];

export type StreamingOptions = Omit<Parameters<typeof _streamText>[0], "model">;

export function streamText(
  messages: Messages,
  videoTranscript: string,
  onFinish?: StreamTextOnFinishCallback<Record<string, Tool>>
) {
  return _streamText({
    model: GeminiModel(),
    system: SYSTEM_PROMPT.replace("{{CONTEXT_HERE}}", videoTranscript),
    messages: convertToModelMessages(messages as any),
    onFinish,
    temperature: 0.7,
  });
}
