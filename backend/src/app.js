import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { getCurrentUser } from "./controllers/auth.controller.js";
import { checkJwt, requireRole } from "./middlewares/auth.middleware.js";
import { notFoundHandler, errorHandler } from "./middlewares/error.middleware.js";
import adminRouter from "./routes/admin.routes.js";
import userRouter from "./routes/user.routes.js";
import { Router } from "express";
const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const apiPrefix = process.env.API_PREFIX || "/api/v1";

const api = Router();
api.get("/auth/me", checkJwt, getCurrentUser);
api.use("/admin", adminRouter);
api.use("/user", userRouter);

app.use(apiPrefix, api);


app.use(notFoundHandler);
app.use(errorHandler);

export default app;
