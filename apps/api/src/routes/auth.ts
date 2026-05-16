import { Hono } from 'hono';
import { SignJWT, jwtVerify } from 'jose';
import type { Env, Variables } from '../types';

export const authRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

authRouter.post('/login', async (c) => {
  const { password } = await c.req.json();

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
  const { refreshToken } = await c.req.json();

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

    return c.json({ token });
  } catch {
    return c.json({ error: 'Invalid refresh token' }, 401);
  }
});
