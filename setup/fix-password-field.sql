-- Fix password_hash field if needed
-- Run this if signup is failing

-- Make password_hash nullable temporarily (if it's not)
ALTER TABLE participant 
ALTER COLUMN password_hash DROP NOT NULL;

-- Then make it NOT NULL again
ALTER TABLE participant 
ALTER COLUMN password_hash SET NOT NULL;