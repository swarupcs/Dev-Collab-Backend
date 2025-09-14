import express from 'express';
import { signup } from '../../controllers/auth.controller.js';

const authRouter = express.Router();

authRouter.get("/test", (req, res) => {
  res.send("✅ Test from auth route");
});

authRouter.post("/signup", signup);

export default authRouter;
