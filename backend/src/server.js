import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import orderRoutes from "./routes/order.routes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api", orderRoutes);

export default app;

if (!process.env.VERCEL) {
  const port = process.env.PORT || 3002;

  app.listen(port, () => {
    console.log(`Voice Kitchen server is running on port ${port}`);
  });
}
