-- Prevent duplicate recurring transaction generation when two devices run simultaneously
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_recurring_tx
  ON transactions (recurring_id, date)
  WHERE recurring_id IS NOT NULL;
