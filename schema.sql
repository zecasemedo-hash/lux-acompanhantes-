CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  public_name TEXT NOT NULL,
  region TEXT NOT NULL,
  description TEXT NOT NULL,
  whatsapp TEXT,
  photo_url TEXT,
  plan TEXT NOT NULL DEFAULT 'standard' CHECK (plan IN ('standard','featured','premium')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','paused')),
  payment_received INTEGER NOT NULL DEFAULT 0 CHECK (payment_received IN (0,1)),
  is_featured INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  expires_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_profiles_public ON profiles(status, expires_at, is_featured, created_at);
