import { Hono } from 'hono';
import { SignJWT, jwtVerify } from 'jose';
import { createSupabaseClient } from '../services/supabase';
import type { Env, Variables } from '../types';

export const authRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

authRouter.post('/login', async (c) => {
  const { email, password } = await c.req.json();

  if (!email || !password) {
    return c.json({ error: 'Email and password required' }, 400);
  }

  const supabase = createSupabaseClient(c.env);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const secret = new TextEncoder().encode(c.env.JWT_SECRET);

  const token = await new SignJWT({ sub: data.user.id })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('15m')
    .sign(secret);

  const refreshToken = await new SignJWT({ sub: data.user.id, type: 'refresh' })
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
