import { describe, it, expect } from "vitest";
import app from "../index";

const testEnv = {
  SUPABASE_URL: process.env.SUPABASE_URL!,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY!,
  JWT_SECRET: process.env.JWT_SECRET!,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY!,
  OWNER_ID: process.env.OWNER_ID!,
  DATABASE_URL: process.env.DATABASE_URL!,
  TEST_EMAIL: process.env.TEST_EMAIL!,
  TEST_PASSWORD: process.env.TEST_PASSWORD!,
};

describe("POST /auth/login", () => {
  it("should return token on valid credentials", async () => {
    const res = await app.request(
      "/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEnv.TEST_EMAIL,
          password: testEnv.TEST_PASSWORD,
        }),
      },
      testEnv,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { token: string; refreshToken: string };
    expect(body.token).toBeDefined();
    expect(body.refreshToken).toBeDefined();
  });

  it("should return 401 on invalid credentials", async () => {
    const res = await app.request(
      "/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "wrong@email.com",
          password: "wrongpassword",
        }),
      },
      testEnv,
    );

    expect(res.status).toBe(401);
  });

  it("should return 400 when missing fields", async () => {
    const res = await app.request(
      "/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@test.com" }),
      },
      testEnv,
    );

    expect(res.status).toBe(400);
  });
});

describe("POST /auth/refresh", () => {
  it("should return new token on valid refresh token", async () => {
    const loginRes = await app.request(
      "/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEnv.TEST_EMAIL,
          password: testEnv.TEST_PASSWORD,
        }),
      },
      testEnv,
    );

    const { refreshToken } = (await loginRes.json()) as {
      refreshToken: string;
    };

    const res = await app.request(
      "/auth/refresh",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      },
      testEnv,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { token: string };
    expect(body.token).toBeDefined();
  });

  it("should return 401 on invalid refresh token", async () => {
    const res = await app.request(
      "/auth/refresh",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: "invalid" }),
      },
      testEnv,
    );

    expect(res.status).toBe(401);
  });
});
