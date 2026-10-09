import express from "express";
import { createOrder, getMenu, startTalk } from "../controllers/order.controller.js";

const router = express.Router();

router.get("/menu", getMenu);
router.post("/talk/start", startTalk);
router.post("/orders", createOrder);

export default router;
