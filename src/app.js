import express, { json } from "express";
import cors from "cors";
import cookieParser from "cookie-parser"; //used so we can access cookies of the user from the server

const app = express();
//when confuguring a package of app use .use()
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "16kb" })); //to get data from json
app.use(express.urlencoded({ extended: true, limit: "16kb" })); //to get data from url
app.use(express.static("public")); //to store files or folders
app.use(cookieParser());

//routes import

import userRouter from "./routes/user.routes.js";

//routes declaration
app.use("/api/v1/users", userRouter);

export { app };
