import { GoogleGenAI, Modality } from "@google/genai";
import menu from "../data/menu.js";

export const voiceModel = "gemini-3.8-live";

const orderTool = {
  functionDeclarations: [
    {
      name: "createOrder",
      description:
        "Save the order after the customer has finished saying what they want.",
      parameters: {
        type: "OBJECT",
        properties: {
          items: {
            type: "ARRAY",
            description: "The foods the customer asked for.",
            items: {
              type: "OBJECT",
              properties: {
                product: {
                  type: "STRING",
                  description: "The exact food name from the menu.",
                },
                quantity: {
                  type: "INTEGER",
                  description: "How many of this food the customer wants.",
                },
              },
              required: ["product", "quantity"],
            },
          },
        },
        required: ["items"],
      },
    },
  ],
};

function voiceRules() {
  const foodNames = menu.map((item) => item.name).join(", ");

  return `
You are a friendly person taking food orders for Voice Kitchen.

The only foods you may accept are: ${foodNames}.

Rules:
1. Ask the customer what they would like.
2. If they do not say how many, ask how many.
3. They may order more than one food.
4. Do not accept a food that is not on the list.
5. Do not make up a price.
6. When the customer is clearly finished, call createOrder.
7. After the saved order comes back, thank them and say each food, the amount, and the total.
`.trim();
}

export const voiceSetup = {
  responseModalities: [Modality.AUDIO],
  tools: [orderTool],
  systemInstruction: voiceRules(),
};

export async function createVoicePass() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    apiVersion: "v1alpha",
  });

  const pass = await ai.authTokens.create({
    config: {
      uses: 1,
      liveConnectConstraints: {
        model: voiceModel,
        config: voiceSetup,
      },
    },
  });

  if (!pass.name) {
    throw new Error("The voice pass was not created.");
  }

  return pass.name;
}
