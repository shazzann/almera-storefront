
-- ============================================================================
-- ALMERA STOREFRONT — CUSTOMER AUTH, PROFILES, ADDRESSES & ORDER LINKING
-- ============================================================================

-- 1. CUSTOMER SAVED ADDRESSES
CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Home',
  recipient_name text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  district text NOT NULL,
  postal_code text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_addresses_user_idx ON public.customer_addresses (user_id);

ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own addresses" ON public.customer_addresses;
CREATE POLICY "Users can read own addresses" ON public.customer_addresses
  FOR SELECT USING (user_id = auth.uid() OR public.is_almera_admin());

DROP POLICY IF EXISTS "Users can insert own addresses" ON public.customer_addresses;
CREATE POLICY "Users can insert own addresses" ON public.customer_addresses
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own addresses" ON public.customer_addresses;
CREATE POLICY "Users can update own addresses" ON public.customer_addresses
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own addresses" ON public.customer_addresses;
CREATE POLICY "Users can delete own addresses" ON public.customer_addresses
  FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admin full access customer_addresses" ON public.customer_addresses;
CREATE POLICY "Admin full access customer_addresses" ON public.customer_addresses
  FOR ALL USING (public.is_almera_admin()) WITH CHECK (public.is_almera_admin());

-- 2. PROFILES ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid() OR public.is_almera_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Admin full access profiles" ON public.profiles;
CREATE POLICY "Admin full access profiles" ON public.profiles
  FOR ALL USING (public.is_almera_admin()) WITH CHECK (public.is_almera_admin());

-- 3. ORDERS & ORDER ITEMS CUSTOMER READ RLS
DROP POLICY IF EXISTS "Customers read own orders" ON public.orders;
CREATE POLICY "Customers read own orders" ON public.orders
  FOR SELECT USING (user_id = auth.uid() OR public.is_almera_admin());

DROP POLICY IF EXISTS "Customers read own order_items" ON public.order_items;
CREATE POLICY "Customers read own order_items" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
       WHERE o.id = order_items.order_id
         AND (o.user_id = auth.uid() OR public.is_almera_admin())
    )
  );

-- 4. AUTO-CREATE PROFILE ON SIGNUP TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    LOWER(NEW.email),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE WHEN profiles.full_name = '' THEN EXCLUDED.full_name ELSE profiles.full_name END,
    phone = COALESCE(profiles.phone, EXCLUDED.phone);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Automatically link any prior guest orders that match the confirmed email
  IF NEW.email IS NOT NULL AND (NEW.email_confirmed_at IS NOT NULL OR NEW.confirmed_at IS NOT NULL) THEN
    PERFORM public.link_guest_orders_to_user(NEW.id, NEW.email);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for when user confirms email later
CREATE OR REPLACE FUNCTION public.handle_user_email_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
     OR (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL) THEN
    PERFORM public.link_guest_orders_to_user(NEW.id, NEW.email);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE OF email_confirmed_at, confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_confirmation();

-- 5. FUNCTION TO LINK PAST GUEST ORDERS
CREATE OR REPLACE FUNCTION public.link_guest_orders_to_user(p_user_id uuid, p_email text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_user_id IS NULL OR p_email IS NULL OR trim(p_email) = '' THEN
    RETURN 0;
  END IF;

  UPDATE public.orders
     SET user_id = p_user_id,
         updated_at = now()
   WHERE user_id IS NULL
     AND LOWER(email) = LOWER(trim(p_email));

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.link_guest_orders_to_user(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_guest_orders_to_user(uuid, text) TO service_role, authenticated;
