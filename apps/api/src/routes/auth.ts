import { Hono } from 'hono';
import { SignJWT, jwtVerify } from 'jose';
import type { Env, Variables } from '../types';
import { parseBody } from '../utils/request';

export const authRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

authRouter.post('/login', async (c) => {
  const body = await parseBody<{ password?: string }>(c);
  if (!body) return c.json({ error: 'Invalid JSON' }, 400);

  const { password } = body;

  if (!password) {
    return c.json({ error: 'Password required' }, 400);
  }

  if (password !== c.env.OWNER_PASSWORD) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const secret = new TextEncoder().encode(c.env.JWT_SECRET);
  const token = await new SignJWT({ sub: c.env.OWNER_ID })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('15m')
    .sign(secret);

  const refreshToken = await new SignJWT({
    sub: c.env.OWNER_ID,
    type: 'refresh',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(secret);

  return c.json({ token, refreshToken });
});

authRouter.post('/refresh', async (c) => {
  const body = await parseBody<{ refreshToken?: string }>(c);
  if (!body) return c.json({ error: 'Invalid JSON' }, 400);

  const { refreshToken } = body;

  if (!refreshToken) {
    return c.json({ error: 'Refresh token required' }, 400);
  }

  try {
    const secret = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(refreshToken, secret);

    if (payload.type !== 'refresh') {
      return c.json({ error: 'Invalid token type' }, 401);
    }

    const token = await new SignJWT({ sub: payload.sub })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('15m')
      .sign(secret);

    const newRefreshToken = await new SignJWT({
      sub: payload.sub,
      type: 'refresh',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('30d')
      .sign(secret);

    return c.json({ token, refreshToken: newRefreshToken });
  } catch {
    return c.json({ error: 'Invalid refresh token' }, 401);
  }
});
