import menu from "../data/menu.js";
import { createVoicePass, voiceModel, voiceSetup } from "../services/gemini.service.js";
import { processOrder } from "../services/order.service.js";

export const getMenu = (req, res) => {
  return res.status(200).json({
    success: true,
    data: menu,
  });
};

export const startTalk = async (req, res) => {
  try {
    const pass = await createVoicePass();

    return res.status(200).json({
      success: true,
      data: {
        pass,
        model: voiceModel,
        setup: voiceSetup,
      },
    });
  } catch (error) {
    console.error("Could not start the voice line:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not start the voice line.",
    });
  }
};

export const createOrder = async (req, res) => {
  try {
    const order = await processOrder(req.body);

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Could not save the order:", error.message);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
