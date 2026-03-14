-- Clean up duplicate open canvasser shifts (keep earliest, close rest)
WITH ranked AS (
  SELECT id, canvasser_id, clock_in_at,
    ROW_NUMBER() OVER (PARTITION BY canvasser_id ORDER BY clock_in_at ASC) as rn
  FROM canvasser_shifts
  WHERE clock_out_at IS NULL
)
UPDATE canvasser_shifts SET
  clock_out_at = now(),
  status = 'completed',
  notes = 'Auto-closed: duplicate open shift'
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Clean up duplicate open production shifts
WITH ranked AS (
  SELECT id, user_id, clock_in_at,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY clock_in_at ASC) as rn
  FROM production_shifts
  WHERE clock_out_at IS NULL
)
UPDATE production_shifts SET
  clock_out_at = now(),
  status = 'completed',
  notes = 'Auto-closed: duplicate open shift'
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Enforce one active shift per canvasser at the database level
CREATE UNIQUE INDEX IF NOT EXISTS idx_canvasser_shifts_one_active
  ON canvasser_shifts (canvasser_id)
  WHERE clock_out_at IS NULL;

-- Enforce one active shift per production contractor at the database level
CREATE UNIQUE INDEX IF NOT EXISTS idx_production_shifts_one_active
  ON production_shifts (user_id)
  WHERE clock_out_at IS NULL;