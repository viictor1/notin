import { Hono } from 'hono';
import { authMiddleware } from '../middlewares/auth';
import { createSupabaseClient } from '../services/supabase';
import type { Env, Variables } from '../types';

export const notesRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

notesRouter.use('*', authMiddleware);

notesRouter.get('/', async (c) => {
  const userId = c.get('userId');
  const supabase = createSupabaseClient(c.env);

  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) return c.json({ error: error.message }, 500);

  return c.json(data);
});

notesRouter.get('/:id', async (c) => {
  const userId = c.get('userId');
  const { id } = c.req.param();
  const supabase = createSupabaseClient(c.env);

  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error) return c.json({ error: 'Note not found' }, 404);

  return c.json(data);
});

notesRouter.post('/', async (c) => {
  const userId = c.get('userId');
  const { title, content } = await c.req.json();
  const supabase = createSupabaseClient(c.env);

  if (!content) return c.json({ error: 'Content required' }, 400);

  const { data, error } = await supabase
    .from('notes')
    .insert({ title, content, user_id: userId })
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 500);

  return c.json(data, 201);
});

notesRouter.put('/:id', async (c) => {
  const userId = c.get('userId');
  const { id } = c.req.param();
  const { title, content } = await c.req.json();
  const supabase = createSupabaseClient(c.env);

  const { data, error } = await supabase
    .from('notes')
    .update({ title, content, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) return c.json({ error: 'Note not found' }, 404);

  return c.json(data);
});

notesRouter.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const { id } = c.req.param();
  const supabase = createSupabaseClient(c.env);

  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) return c.json({ error: 'Note not found' }, 404);

  return c.json({ success: true });
});
