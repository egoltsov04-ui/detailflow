-- Run once in Supabase SQL Editor. Existing bookings keep their current status.
alter type public.appointment_status add value if not exists 'pending';
