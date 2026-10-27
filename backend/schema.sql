CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  public_name TEXT NOT NULL CHECK(length(public_name) BETWEEN 1 AND 60),
  city TEXT NOT NULL CHECK(length(city) BETWEEN 1 AND 60),
  description TEXT NOT NULL CHECK(length(description) BETWEEN 1 AND 500),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','published','rejected')),
  age_confirmed INTEGER NOT NULL DEFAULT 0 CHECK(age_confirmed IN (0,1)),
  authorized_to_publish INTEGER NOT NULL DEFAULT 0 CHECK(authorized_to_publish IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS listings_status_city_created ON listings(status, city, created_at DESC);