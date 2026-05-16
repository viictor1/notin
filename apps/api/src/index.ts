import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRouter } from './routes/auth';
import { notesRouter } from './routes/notes';
import type { Env, Variables } from './types';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use(
  '*',
  cors({
    origin: (origin) => {
      const allowed = [
        'https://notin-web.pages.dev',
        'http://localhost:5173',
        'http://localhost:8787',
      ];
      if (!origin || allowed.includes(origin)) return origin ?? allowed[0];
      throw new Error('Not allowed by CORS');
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.route('/auth', authRouter);
app.route('/notes', notesRouter);

app.get('/health', (c) => c.json({ status: 'ok' }));

export default app;
