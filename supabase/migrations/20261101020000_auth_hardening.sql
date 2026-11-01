-- Closes guest-order takeover and adds sign-in limits that hold across server instances.

-- Any signed-in customer could call this with someone else's email and take their guest orders.
-- Only the server and the database's own confirmation triggers may run it now.
REVOKE EXECUTE ON FUNCTION public.link_guest_orders_to_user(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_guest_orders_to_user(uuid, text) TO service_role;

-- Keys are SHA-256 hashes, so no email or IP address is stored here.
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  key text PRIMARY KEY,
  attempts integer NOT NULL,
  window_ends timestamptz NOT NULL
);

ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.auth_rate_limits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_auth_rate_limit(p_key text, p_max integer, p_window_seconds integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempts integer;
BEGIN
  INSERT INTO public.auth_rate_limits AS l (key, attempts, window_ends)
  VALUES (p_key, 1, now() + make_interval(secs => p_window_seconds))
  ON CONFLICT (key) DO UPDATE SET
    attempts = CASE WHEN l.window_ends < now() THEN 1 ELSE l.attempts + 1 END,
    window_ends = CASE WHEN l.window_ends < now() THEN now() + make_interval(secs => p_window_seconds) ELSE l.window_ends END
  RETURNING attempts INTO v_attempts;

  IF random() < 0.01 THEN
    DELETE FROM public.auth_rate_limits WHERE window_ends < now();
  END IF;

  RETURN v_attempts <= p_max;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_auth_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_auth_rate_limit(text, integer, integer) TO service_role;
