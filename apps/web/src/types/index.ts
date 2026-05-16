export type Note = {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
  updated_at: string;
};

export type AuthResponse = {
  token: string;
  refreshToken: string;
};
