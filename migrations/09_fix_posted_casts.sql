-- Fix any casts that were posted but not marked as posted
UPDATE scheduled_casts
SET 
  posted = true, 
  posted_at = NOW()
WHERE 
  scheduled_time <= NOW() 
  AND posted = false; 