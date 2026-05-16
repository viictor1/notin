import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRouter } from "./routes/auth";
import { notesRouter } from "./routes/notes";
import type { Env, Variables } from "./types";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.route("/auth", authRouter);
app.route("/notes", notesRouter);

app.get("/health", (c) => c.json({ status: "ok" }));

export default app;
