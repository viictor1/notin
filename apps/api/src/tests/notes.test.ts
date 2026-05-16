import { describe, it, expect, beforeAll } from 'vitest';
import app from '../index';

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

let token: string;
let createdNoteId: string;

beforeAll(async () => {
  const res = await app.request(
    '/auth/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEnv.TEST_EMAIL,
        password: testEnv.TEST_PASSWORD,
      }),
    },
    testEnv
  );

  const body = (await res.json()) as { token: string };

  // decodifica o payload sem verificar assinatura
  if (body.token) {
    const payload = JSON.parse(atob(body.token.split('.')[1]));
  }

  token = body.token;
});

describe('POST /notes', () => {
  it('should create a note', async () => {
    const res = await app.request(
      '/notes',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: 'nota de teste',
          content: 'conteudo de teste',
        }),
      },
      testEnv
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      id: string;
      title: string;
      content: string;
    };
    expect(body.id).toBeDefined();
    expect(body.title).toBe('nota de teste');
    expect(body.content).toBe('conteudo de teste');
    createdNoteId = body.id;
  });

  it('should return 400 when content is missing', async () => {
    const res = await app.request(
      '/notes',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: 'sem conteudo' }),
      },
      testEnv
    );

    expect(res.status).toBe(400);
  });

  it('should return 401 without token', async () => {
    const res = await app.request(
      '/notes',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'test', content: 'test' }),
      },
      testEnv
    );

    expect(res.status).toBe(401);
  });
});

describe('GET /notes', () => {
  it('should list notes', async () => {
    const res = await app.request(
      '/notes',
      {
        headers: { Authorization: `Bearer ${token}` },
      },
      testEnv
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ id: string }>;
    expect(Array.isArray(body)).toBe(true);
  });

  it('should return 401 without token', async () => {
    const res = await app.request('/notes', {}, testEnv);
    expect(res.status).toBe(401);
  });
});

describe('GET /notes/:id', () => {
  it('should return a note by id', async () => {
    const res = await app.request(
      `/notes/${createdNoteId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
      testEnv
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string };
    expect(body.id).toBe(createdNoteId);
  });

  it('should return 404 for nonexistent note', async () => {
    const res = await app.request(
      '/notes/00000000-0000-0000-0000-000000000000',
      {
        headers: { Authorization: `Bearer ${token}` },
      },
      testEnv
    );

    expect(res.status).toBe(404);
  });
});

describe('PUT /notes/:id', () => {
  it('should update a note', async () => {
    const res = await app.request(
      `/notes/${createdNoteId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: 'titulo atualizado',
          content: 'conteudo atualizado',
        }),
      },
      testEnv
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { title: string; content: string };
    expect(body.title).toBe('titulo atualizado');
    expect(body.content).toBe('conteudo atualizado');
  });
});

describe('DELETE /notes/:id', () => {
  it('should delete a note', async () => {
    const res = await app.request(
      `/notes/${createdNoteId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      },
      testEnv
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });

  it('should return 404 after deletion', async () => {
    const res = await app.request(
      `/notes/${createdNoteId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
      testEnv
    );

    expect(res.status).toBe(404);
  });
});
