export type Note = {
  id: string
  title: string | null
  content: string
  created_at: string
  updated_at: string
}

export type Env = {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
  JWT_SECRET: string
  ENCRYPTION_KEY: string
  OWNER_ID: string
  DATABASE_URL: string
  TEST_EMAIL: string
  TEST_PASSWORD: string
}

export type Variables = {
  userId: string
}