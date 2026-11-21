-- One row per drive; the full route, stops, counts and feedback live in `data` (JSON).
CREATE TABLE IF NOT EXISTS drives (
  id TEXT PRIMARY KEY,
  bank TEXT NOT NULL,
  status TEXT NOT NULL,
  data TEXT NOT NULL,
  updated INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS drives_bank ON drives (bank, updated);

-- GPS trail and live forecast, one row every few seconds.
CREATE TABLE IF NOT EXISTS points (
  drive TEXT NOT NULL,
  t INTEGER NOT NULL,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  spd REAL,
  hdg REAL,
  eta INTEGER
);
CREATE INDEX IF NOT EXISTS points_drive ON points (drive, t);

-- Motion markers, pickups, cold-chain start, recording gaps, store "ready" taps.
CREATE TABLE IF NOT EXISTS events (
  drive TEXT NOT NULL,
  t INTEGER NOT NULL,
  kind TEXT NOT NULL,
  data TEXT
);
CREATE INDEX IF NOT EXISTS events_drive ON events (drive, t);

-- Driver notes about a store ("what got in the way"), shown on store pages.
CREATE TABLE IF NOT EXISTS notes (
  store TEXT NOT NULL,
  t INTEGER NOT NULL,
  drive TEXT,
  text TEXT NOT NULL,
  tags TEXT
);
CREATE INDEX IF NOT EXISTS notes_store ON notes (store, t);

-- Deliveries from the parent food bank to the pantry: order, window, invoice lines, the driver's
-- call-ahead time, the food bank driver's live run (driveId) and the pantry's receipt, in `data` (JSON).
CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY,
  bank TEXT NOT NULL,
  data TEXT NOT NULL,
  updated INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS deliveries_bank ON deliveries (bank, updated);
