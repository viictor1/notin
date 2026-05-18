import { Hono } from 'hono';
import { SignJWT, jwtVerify } from 'jose';
import type { Env, Variables } from '../types';
import { parseBody } from '../utils/request';
import * as OTPAuth from 'otpauth';

export const authRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

const COOKIE_NAME = 'refresh_token';

const getCookieOptions = () => {
  return `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000`;
};

authRouter.post('/login', async (c) => {
  const body = await parseBody<{ password?: string; code?: string }>(c);
  if (!body) return c.json({ error: 'Invalid JSON' }, 400);

  const { password, code } = body;
  if (!password && !code)
    return c.json({ error: 'Password or code required' }, 400);

  if (password && password !== c.env.OWNER_PASSWORD)
    return c.json({ error: 'Invalid credentials' }, 401);

  if (code) {
    if (!c.env.TOTP_SECRET) {
      return c.json({ error: 'Authenticator not configured' }, 503);
    }
    let totpSecret: OTPAuth.Secret;
    try {
      totpSecret = OTPAuth.Secret.fromBase32(c.env.TOTP_SECRET);
    } catch {
      return c.json({ error: 'Authenticator not configured' }, 503);
    }
    const totp = new OTPAuth.TOTP({
      secret: totpSecret,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });
    if (totp.validate({ token: code, window: 1 }) === null)
      return c.json({ error: 'Invalid code' }, 401);
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

  c.header(
    'Set-Cookie',
    `${COOKIE_NAME}=${refreshToken}; ${getCookieOptions()}`
  );
  return c.json({ accessToken: token, refreshToken });
});

authRouter.post('/refresh', async (c) => {
  const cookieHeader = c.req.header('Cookie') ?? '';
  const cookieToken = cookieHeader
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${COOKIE_NAME}=`))
    ?.split('=')[1];

  const body = await c.req.json().catch(() => ({}));
  const refreshToken = cookieToken ?? body.refreshToken;

  if (!refreshToken) return c.json({ error: 'Refresh token required' }, 401);

  try {
    const secret = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(refreshToken, secret);

    if (payload.type !== 'refresh')
      return c.json({ error: 'Invalid token type' }, 401);

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

    c.header(
      'Set-Cookie',
      `${COOKIE_NAME}=${newRefreshToken}; ${getCookieOptions()}`
    );
    return c.json({ accessToken: token, refreshToken: newRefreshToken });
  } catch {
    return c.json({ error: 'Invalid refresh token' }, 401);
  }
});

authRouter.post('/logout', (c) => {
  const clearOptions = `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;

  c.header('Set-Cookie', `${COOKIE_NAME}=; ${clearOptions}`);
  return c.json({ success: true });
});
