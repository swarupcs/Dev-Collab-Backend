import express from "express";
import { editProfile, getProfile } from "../../controllers/profile.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";

const profileRouter = express.Router();

profileRouter.use(authMiddleware);

profileRouter.get("/getProfile", getProfile);
profileRouter.post("/editProfile", editProfile);


export default profileRouter;