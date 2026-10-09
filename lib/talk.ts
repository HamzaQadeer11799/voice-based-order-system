import {
  GoogleGenAI,
  type LiveConnectConfig,
  type LiveServerMessage,
  type Session,
} from "@google/genai";
import { openMic, playReply, startListening, stopReply } from "./voice";

export type SavedOrder = {
  items: {
    productId: number;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  totalAmount: number;
};

type VoiceStart = {
  pass: string;
  model: string;
  setup: LiveConnectConfig;
};

type FoodCall = {
  id?: string;
  name?: string;
  args?: Record<string, unknown>;
};

type TalkHandlers = {
  onOrder: (order: SavedOrder) => void;
  onProblem: (text: string) => void;
  onEnd: () => void;
};

export async function openTalk(handlers: TalkHandlers) {
  const stream = await openMic();
  const line: { session: Session | null } = { session: null };

  let stopListening = () => {
    stream.getTracks().forEach((track) => track.stop());
  };

  try {
    const start = await askForPass();
    const ai = new GoogleGenAI({
      apiKey: start.pass,
      apiVersion: "v1alpha",
    });

    line.session = await ai.live.connect({
      model: start.model,
      config: start.setup,
      callbacks: {
        onmessage(message: LiveServerMessage) {
          void readMessage(message, line, handlers);
        },
        onerror() {
          handlers.onProblem("The voice line hit a problem. Please try again.");
        },
        onclose() {
          handlers.onEnd();
        },
      },
    });

    stopListening = startListening(stream, (soundText) => {
      line.session?.sendRealtimeInput({
        audio: {
          data: soundText,
          mimeType: "audio/pcm;rate=16000",
        },
      });
    });

    line.session.sendClientContent({
      turns: [
        {
          role: "user",
          parts: [{ text: "Hello. I would like to place an order." }],
        },
      ],
      turnComplete: true,
    });

    return function closeTalk() {
      stopListening();
      stopReply();
      line.session?.close();
    };
  } catch (error) {
    stopListening();
    stopReply();
    line.session?.close();
    throw error;
  }
}

async function askForPass() {
  let response: Response;

  try {
    response = await fetch("/api/talk/start", { method: "POST" });
  } catch {
    throw new Error("Could not reach the server.");
  }

  const body = await response.json();

  if (!response.ok || !body.success) {
    throw new Error(body.message || "Could not start the voice line.");
  }

  return body.data as VoiceStart;
}

async function readMessage(
  message: LiveServerMessage,
  line: { session: Session | null },
  handlers: TalkHandlers,
) {
  if (message.serverContent?.interrupted) {
    stopReply();
  }

  if (message.data) {
    playReply(message.data);
  }

  const calls = message.toolCall?.functionCalls || [];

  for (const call of calls) {
    if (call.name !== "createOrder") {
      continue;
    }

    await saveOrder(call, line.session, handlers);
  }
}

async function saveOrder(
  call: FoodCall,
  session: Session | null,
  handlers: TalkHandlers,
) {
  if (!session) {
    handlers.onProblem("The voice line is not open.");
    return;
  }

  try {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(call.args || {}),
    });
    const body = await response.json();

    session.sendToolResponse({
      functionResponses: [
        {
          id: call.id,
          name: call.name || "createOrder",
          response: body.success
            ? { output: body.data }
            : { error: body.message || "That order could not be saved." },
        },
      ],
    });

    if (body.success) {
      handlers.onOrder(body.data as SavedOrder);
      return;
    }

    handlers.onProblem(body.message || "That order could not be saved.");
  } catch {
    session.sendToolResponse({
      functionResponses: [
        {
          id: call.id,
          name: call.name || "createOrder",
          response: { error: "That order could not be saved." },
        },
      ],
    });
    handlers.onProblem("That order could not be saved.");
  }
}
