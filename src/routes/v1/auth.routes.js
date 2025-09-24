import express from 'express';
import { signin, signout, signup } from '../../controllers/auth.controller.js';


const authRouter = express.Router();

authRouter.get("/test", (req, res) => {
  res.send("✅ Test from auth route");
});

// authRouter.use(authMiddleware);

authRouter.post("/signup", signup);
authRouter.post("/signin", signin);
authRouter.post("/signout", signout);

export default authRouter;


/**
 * No need of authMiddleware for the above routes, and remove the /getUserDetails routes
 * 
 * 
 */