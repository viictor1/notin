import { describe, it, expect } from 'vitest';
import app from '../index';
import * as OTPAuth from 'otpauth';

const testEnv = {
  SUPABASE_URL: process.env.SUPABASE_URL!,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY!,
  JWT_SECRET: process.env.JWT_SECRET!,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY!,
  OWNER_ID: process.env.OWNER_ID!,
  OWNER_PASSWORD: process.env.OWNER_PASSWORD!,
  TOTP_SECRET: process.env.TOTP_SECRET!,
};

describe('POST /auth/login', () => {
  it('should return token on valid credentials', async () => {
    const res = await app.request(
      '/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: testEnv.OWNER_PASSWORD }),
      },
      testEnv
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { accessToken: string };
    expect(body.accessToken).toBeDefined();
    const setCookieHeader = res.headers.get('Set-Cookie');
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader).toContain('refresh_token=');
  });

  it('should return token on valid totp code', async () => {
    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(testEnv.TOTP_SECRET),
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });
    const code = totp.generate();
    const res = await app.request(
      '/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      },
      testEnv
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { accessToken: string };
    expect(body.accessToken).toBeDefined();
  });

  it('should return 401 on invalid password', async () => {
    const res = await app.request(
      '/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'wrongpassword' }),
      },
      testEnv
    );
    expect(res.status).toBe(401);
  });

  it('should return 401 on invalid totp code', async () => {
    const res = await app.request(
      '/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: '000000' }),
      },
      testEnv
    );
    expect(res.status).toBe(401);
  });

  it('should return 400 when no credential is provided', async () => {
    const res = await app.request(
      '/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      },
      testEnv
    );
    expect(res.status).toBe(400);
  });
});

describe('POST /auth/refresh', () => {
  it('should return new token on valid refresh token', async () => {
    const loginRes = await app.request(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ password: testEnv.OWNER_PASSWORD }),
        headers: new Headers({ 'Content-Type': 'application/json' }),
      },
      testEnv
    );
    const cookie = loginRes.headers.get('Set-Cookie');
    const res = await app.request(
      '/auth/refresh',
      {
        method: 'POST',
        headers: new Headers({
          Cookie: cookie || '',
        }),
      },
      testEnv
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { accessToken: string };
    expect(body.accessToken).toBeDefined();
    const newCookie = res.headers.get('Set-Cookie');
    expect(newCookie).toContain('refresh_token=');
  });

  it('should return 401 on invalid refresh token', async () => {
    const res = await app.request(
      '/auth/refresh',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: 'invalid' }),
      },
      testEnv
    );
    expect(res.status).toBe(401);
  });
});
