import express from 'express';
import { getUserDetails, signin, signout, signup } from '../../controllers/auth.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';

const authRouter = express.Router();

authRouter.get("/test", (req, res) => {
  res.send("✅ Test from auth route");
});

authRouter.use(authMiddleware);

authRouter.post("/signup", signup);
authRouter.post("/signin", signin);
authRouter.post("/signout", signout);
authRouter.post("/getUserDetails", getUserDetails);

export default authRouter;
