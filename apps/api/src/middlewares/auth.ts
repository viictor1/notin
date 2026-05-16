import { createMiddleware } from 'hono/factory';
import { jwtVerify } from 'jose';
import type { Env } from '../types';

export const authMiddleware = createMiddleware<{ Bindings: Env }>(
  async (c, next) => {
    const authorization = c.req.header('Authorization');

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authorization.split(' ')[1];

    try {
      const secret = new TextEncoder().encode(c.env.JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);

      if (payload.sub !== c.env.OWNER_ID) {
        return c.json({ error: 'Forbidden' }, 403);
      }

      c.set('userId', payload.sub);
      await next();
    } catch {
      return c.json({ error: 'Invalid token' }, 401);
    }
  }
);
