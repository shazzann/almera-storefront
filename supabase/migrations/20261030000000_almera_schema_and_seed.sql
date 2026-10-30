-- ============================================================================
-- ALMERA STOREFRONT — PRODUCTION DATABASE SCHEMA, RPCs, RLS & SEED DATA
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. CATEGORIES & SUBCATEGORY CHIPS
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  nav_group text NOT NULL DEFAULT 'Everyday' CHECK (nav_group IN ('Everyday', 'Special', 'More')),
  subcategories text[] NOT NULL DEFAULT '{}',
  description text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. PRODUCTS (ALMERA DOMAIN MODEL)
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  categories text[] NOT NULL CHECK (cardinality(categories) >= 1),
  primary_category text GENERATED ALWAYS AS (categories[1]) STORED,
  subcategory text,
  colour text NOT NULL DEFAULT '',
  fabric text NOT NULL DEFAULT '',
  price_unstitched numeric(10,2) CHECK (price_unstitched IS NULL OR price_unstitched >= 0),
  price_stitched numeric(10,2) CHECK (price_stitched IS NULL OR price_stitched >= 0),
  was_price_unstitched numeric(10,2) CHECK (was_price_unstitched IS NULL OR was_price_unstitched >= 0),
  was_price_stitched numeric(10,2) CHECK (was_price_stitched IS NULL OR was_price_stitched >= 0),
  starting_price numeric(10,2) GENERATED ALWAYS AS (
    LEAST(COALESCE(price_unstitched, price_stitched), COALESCE(price_stitched, price_unstitched))
  ) STORED,
  is_ready_to_wear boolean GENERATED ALWAYS AS (
    price_unstitched IS NULL AND price_stitched IS NOT NULL AND NOT ('western' = ANY(categories))
  ) STORED,
  images text[] NOT NULL DEFAULT '{}',
  pieces text[] NOT NULL DEFAULT '{}',
  sizes text[] NOT NULL DEFAULT ARRAY['XS', 'S', 'M', 'L', 'XL'],
  tags text[] NOT NULL DEFAULT '{}',
  description text NOT NULL DEFAULT '',
  care text,
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_stitching_price CHECK (price_unstitched IS NOT NULL OR price_stitched IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS products_categories_gin_idx ON public.products USING GIN (categories);
CREATE INDEX IF NOT EXISTS products_tags_gin_idx ON public.products USING GIN (tags);
CREATE INDEX IF NOT EXISTS products_active_starting_price_idx ON public.products (is_active, starting_price);
CREATE INDEX IF NOT EXISTS products_ready_to_wear_idx ON public.products (is_active, is_ready_to_wear);

-- 3. PRODUCT VARIANTS (PER-STITCHING & PER-SIZE STOCK)
CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  stitching text NOT NULL CHECK (stitching IN ('unstitched', 'stitched')),
  size text NOT NULL DEFAULT '-',
  sku text UNIQUE,
  price_override numeric(10,2),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, stitching, size)
);

CREATE INDEX IF NOT EXISTS product_variants_lookup_idx ON public.product_variants (product_id, stitching, size);

CREATE OR REPLACE FUNCTION public.refresh_product_stock(p_product_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.products
     SET stock = COALESCE((
       SELECT SUM(stock) FROM public.product_variants
        WHERE product_id = p_product_id AND is_active = true
     ), 0),
     updated_at = now()
   WHERE id = p_product_id
     AND EXISTS (SELECT 1 FROM public.product_variants WHERE product_id = p_product_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_refresh_product_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP IN ('DELETE', 'UPDATE') THEN PERFORM public.refresh_product_stock(OLD.product_id); END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN PERFORM public.refresh_product_stock(NEW.product_id); END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS variant_stock_sync ON public.product_variants;
CREATE TRIGGER variant_stock_sync
AFTER INSERT OR UPDATE OF stock, is_active, product_id OR DELETE ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION public.trg_refresh_product_stock();

-- 4. COUPONS & PROMOTIONS
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'free_delivery')) DEFAULT 'percentage',
  discount_value numeric(10,2) NOT NULL DEFAULT 0,
  min_order_value numeric(10,2) NOT NULL DEFAULT 0,
  max_discount_amount numeric(10,2) DEFAULT NULL,
  max_uses integer DEFAULT NULL,
  used_count integer NOT NULL DEFAULT 0,
  first_order_only boolean NOT NULL DEFAULT false,
  exclude_sale_items boolean NOT NULL DEFAULT false,
  allowed_categories text[] NOT NULL DEFAULT '{}',
  allowed_subcategories text[] NOT NULL DEFAULT '{}',
  expires_at timestamptz DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS exclude_sale_items boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allowed_subcategories text[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.touch_coupon_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_coupon_updated_at ON public.coupons;
CREATE TRIGGER set_coupon_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.touch_coupon_updated_at();

-- 5. ORDERS & ORDER ITEMS (ALM-XXXXX FORMAT)
CREATE SEQUENCE IF NOT EXISTS public.almera_order_seq START WITH 10001;

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_seq bigint NOT NULL DEFAULT nextval('public.almera_order_seq'),
  order_number text GENERATED ALWAYS AS ('ALM-' || order_seq::text) STORED UNIQUE,
  idempotency_key uuid UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  phone text NOT NULL,
  email text,
  address text NOT NULL,
  city text NOT NULL,
  district text NOT NULL,
  postal_code text,
  notes text,
  subtotal numeric(10,2) NOT NULL CHECK (subtotal >= 0),
  delivery_fee numeric(10,2) NOT NULL DEFAULT 450 CHECK (delivery_fee >= 0),
  coupon_code text,
  discount_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total numeric(10,2) NOT NULL CHECK (total >= 0),
  payment_method text NOT NULL CHECK (payment_method IN ('cod', 'bank', 'card')) DEFAULT 'cod',
  payment_id text,
  bank_slip_reference text,
  advance_deposit numeric(10,2) NOT NULL DEFAULT 0,
  advance_deposit_note text,
  advance_deposit_at timestamptz,
  refund_amount numeric(10,2) NOT NULL DEFAULT 0,
  refund_reason text,
  refunded_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN (
      'pending',
      'awaiting_bank_slip',
      'payment_pending',
      'payment_processing',
      'confirmed',
      'shipped',
      'delivered',
      'cancelled',
      'processing_failed',
      'partially_refunded',
      'refunded'
    )
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_phone_idx ON public.orders (phone);
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS orders_status_created_idx ON public.orders (status, created_at DESC);

-- Advance deposit tracking for Cash-on-Delivery orders > LKR 3,000
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS advance_deposit numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS advance_deposit_note text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS advance_deposit_at timestamptz DEFAULT NULL;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_advance_deposit_non_negative;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_advance_deposit_non_negative CHECK (advance_deposit >= 0);

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_slug text NOT NULL,
  product_name text NOT NULL,
  stitching text NOT NULL CHECK (stitching IN ('unstitched', 'stitched')),
  size text,
  unit_price numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  quantity integer NOT NULL CHECK (quantity >= 1),
  image_url text
);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items (order_id);

-- 6. PROFILES, ROLES & AUDIT LOG
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text,
  email text,
  default_shipping_address text,
  default_shipping_city text,
  default_shipping_district text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('customer', 'admin')),
  PRIMARY KEY (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 7. SOLE ADMIN PROVISIONING & LOCK (almeralk26@gmail.com)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enforce_sole_almera_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_email text;
BEGIN
  IF NEW.role = 'admin' THEN
    SELECT lower(email) INTO v_email FROM auth.users WHERE id = NEW.user_id;
    IF v_email IS DISTINCT FROM 'almeralk26@gmail.com' THEN
      RAISE EXCEPTION 'Only almeralk26@gmail.com is permitted to hold the admin role.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_sole_almera_admin ON public.user_roles;
CREATE TRIGGER trg_enforce_sole_almera_admin
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_sole_almera_admin();

-- Ensure only almeralk26@gmail.com holds the admin role in public.user_roles
DO $$
DECLARE
  v_admin_id uuid;
BEGIN
  SELECT id INTO v_admin_id FROM auth.users WHERE lower(email) = 'almeralk26@gmail.com' LIMIT 1;

  IF v_admin_id IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE role = 'admin' AND user_id <> v_admin_id;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_admin_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.profiles (id, full_name, email)
    VALUES (v_admin_id, 'Almera Admin', 'almeralk26@gmail.com')
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_almera_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.user_roles ur
      JOIN auth.users u ON u.id = ur.user_id
     WHERE ur.user_id = auth.uid()
       AND ur.role = 'admin'
       AND lower(u.email) = 'almeralk26@gmail.com'
  );
$$;

-- ============================================================================
-- 8. ATOMIC PL/pgSQL RPC FUNCTIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.deduct_stock(p_table text, p_id uuid, p_quantity int)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rows_affected int;
BEGIN
  IF p_table = 'products' THEN
    UPDATE public.products
       SET stock = stock - p_quantity, updated_at = now()
     WHERE id = p_id AND stock >= p_quantity;
  ELSIF p_table = 'product_variants' THEN
    UPDATE public.product_variants
       SET stock = stock - p_quantity
     WHERE id = p_id AND stock >= p_quantity;
  ELSE
    RETURN FALSE;
  END IF;

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_stock(p_table text, p_id uuid, p_quantity int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(current_setting('role', true), '') <> 'service_role' AND NOT public.is_almera_admin() THEN
    RAISE EXCEPTION 'Forbidden: Only service_role or Almera admin may restore stock.';
  END IF;
  IF p_table = 'products' THEN
    UPDATE public.products SET stock = stock + p_quantity, updated_at = now() WHERE id = p_id;
  ELSIF p_table = 'product_variants' THEN
    UPDATE public.product_variants SET stock = stock + p_quantity WHERE id = p_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_coupon_usage(p_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rows_affected integer;
BEGIN
  UPDATE public.coupons
     SET used_count = used_count + 1, updated_at = now()
   WHERE code = upper(trim(p_code))
     AND is_active = true
     AND (max_uses IS NULL OR used_count < max_uses);
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_coupon_usage(p_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rows_affected integer;
BEGIN
  IF COALESCE(current_setting('role', true), '') <> 'service_role' AND NOT public.is_almera_admin() THEN
    RAISE EXCEPTION 'Forbidden: Only service_role or Almera admin may decrement coupon usage.';
  END IF;
  UPDATE public.coupons
     SET used_count = GREATEST(0, used_count - 1), updated_at = now()
   WHERE code = upper(trim(p_code)) AND used_count > 0;
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.deduct_stock(text, uuid, int) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restore_stock(text, uuid, int) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_coupon_usage(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_coupon_usage(text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.deduct_stock(text, uuid, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.restore_stock(text, uuid, int) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_coupon_usage(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrement_coupon_usage(text) TO service_role, authenticated;

-- ============================================================================
-- 9. ROW LEVEL SECURITY & STORAGE BUCKET
-- ============================================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active categories" ON public.categories;
CREATE POLICY "Public read active categories" ON public.categories FOR SELECT USING (is_active = true OR public.is_almera_admin());
DROP POLICY IF EXISTS "Admin full categories" ON public.categories;
CREATE POLICY "Admin full categories" ON public.categories FOR ALL USING (public.is_almera_admin()) WITH CHECK (public.is_almera_admin());

DROP POLICY IF EXISTS "Public read active products" ON public.products;
CREATE POLICY "Public read active products" ON public.products FOR SELECT USING (is_active = true OR public.is_almera_admin());
DROP POLICY IF EXISTS "Admin full products" ON public.products;
CREATE POLICY "Admin full products" ON public.products FOR ALL USING (public.is_almera_admin()) WITH CHECK (public.is_almera_admin());

DROP POLICY IF EXISTS "Public read active variants" ON public.product_variants;
CREATE POLICY "Public read active variants" ON public.product_variants FOR SELECT USING (is_active = true OR public.is_almera_admin());
DROP POLICY IF EXISTS "Admin full variants" ON public.product_variants;
CREATE POLICY "Admin full variants" ON public.product_variants FOR ALL USING (public.is_almera_admin()) WITH CHECK (public.is_almera_admin());

-- Zero-Trust RLS on coupons: block client-side scraping of private/influencer codes
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.coupons FROM anon;
GRANT ALL ON public.coupons TO service_role;
DROP POLICY IF EXISTS "Public read active coupons" ON public.coupons;
DROP POLICY IF EXISTS "Service role full access on coupons" ON public.coupons;
CREATE POLICY "Service role full access on coupons"
  ON public.coupons FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Admin full coupons" ON public.coupons;
CREATE POLICY "Admin full coupons"
  ON public.coupons FOR ALL USING (public.is_almera_admin()) WITH CHECK (public.is_almera_admin());

-- Zero-Trust RLS on orders and order_items: prevent anonymous PII scraping
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.orders FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.order_items FROM anon;
GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.order_items TO service_role;

DROP POLICY IF EXISTS "Checkout insert orders" ON public.orders;
DROP POLICY IF EXISTS "Checkout read orders" ON public.orders;
DROP POLICY IF EXISTS "Service role full orders" ON public.orders;
CREATE POLICY "Service role full orders"
  ON public.orders FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Admin full orders" ON public.orders;
CREATE POLICY "Admin full orders"
  ON public.orders FOR ALL USING (public.is_almera_admin()) WITH CHECK (public.is_almera_admin());

DROP POLICY IF EXISTS "Checkout insert order_items" ON public.order_items;
DROP POLICY IF EXISTS "Checkout read order_items" ON public.order_items;
DROP POLICY IF EXISTS "Service role full order_items" ON public.order_items;
CREATE POLICY "Service role full order_items"
  ON public.order_items FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Admin full order_items" ON public.order_items;
CREATE POLICY "Admin full order_items"
  ON public.order_items FOR ALL USING (public.is_almera_admin()) WITH CHECK (public.is_almera_admin());

DROP POLICY IF EXISTS "Read own user_roles" ON public.user_roles;
CREATE POLICY "Read own user_roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid() OR public.is_almera_admin());

DROP POLICY IF EXISTS "Admin full audit_log" ON public.audit_log;
CREATE POLICY "Admin full audit_log" ON public.audit_log FOR ALL USING (public.is_almera_admin()) WITH CHECK (public.is_almera_admin());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE
SET allowed_mime_types = EXCLUDED.allowed_mime_types,
    file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS "Public read product-images" ON storage.objects;
CREATE POLICY "Public read product-images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
DROP POLICY IF EXISTS "Admin upload product-images" ON storage.objects;
CREATE POLICY "Admin upload product-images" ON storage.objects FOR ALL USING (bucket_id = 'product-images' AND public.is_almera_admin()) WITH CHECK (bucket_id = 'product-images' AND public.is_almera_admin());

-- ============================================================================
-- 10. SEED CATEGORIES & STARTER COUPONS
-- ============================================================================
INSERT INTO public.categories (slug, name, nav_group, subcategories, description, image_url, sort_order)
VALUES
  ('day-to-day', 'Day to Day', 'Everyday', ARRAY['Cotton', 'Rayon', 'Muslin'], 'Easy cotton, rayon and muslin for work, errands and everything in between. Soft, breathable and made to be worn often.', 'https://images.unsplash.com/photo-1745313452052-0e4e341f326c', 1),
  ('signature-styles', 'Signature Styles', 'Special', ARRAY['Semi Rich', 'Hakoba', 'Khushboo'], 'The pieces almera is known for: semi-rich suits, hakoba embroidery and khushboo, for when you want to look a little more dressed.', 'https://images.unsplash.com/photo-1652953186915-420ae843d1a8', 2),
  ('occasion', 'Occasion', 'Special', ARRAY['Lehengas'], 'Premium festive and occasion wear, from Eid suits to lehengas for the nikah, the mehndi and the walima.', 'https://images.unsplash.com/photo-1746372283841-dbb3838f9935', 3),
  ('pakistani', 'Pakistani', 'More', '{}', 'Lawn, embroidered suits and bridal wear from Pakistan, chosen piece by piece and delivered across Sri Lanka.', 'https://images.unsplash.com/photo-1705920824583-0e783235394d', 4),
  ('casual', 'Casual', 'Everyday', '{}', 'Relaxed prints and easy co-ords for days out, visits and weekends.', 'https://images.unsplash.com/photo-1764928947261-f5687e0faa4a', 5),
  ('lawns', 'Lawns', 'Everyday', '{}', 'Breathable printed and embroidered lawn, made for Sri Lankan heat. Buy the three-piece unstitched or have us stitch it to your size.', 'https://images.unsplash.com/photo-1597983073750-16f5ded1321f', 6),
  ('lux', 'Lux', 'Special', '{}', 'Our finest pieces, with rich fabrics and dense hand embellishment. Most are one of a kind.', 'https://images.unsplash.com/photo-1747847471517-952a3eb93a89', 7),
  ('ready-to-wear', 'Ready to Wear', 'More', '{}', 'Finished outfits, pressed and packed. Wear them the day they arrive.', 'https://images.unsplash.com/photo-1733209484732-6b094322a89f', 8),
  ('western', 'Western', 'More', ARRAY['Denim'], 'Denim that goes with everything, from everyday jeans to jackets and co-ords.', 'https://images.unsplash.com/photo-1760624294535-40dfdc84a48f', 9)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  nav_group = EXCLUDED.nav_group,
  subcategories = EXCLUDED.subcategories,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.coupons (code, discount_type, discount_value, min_order_value, max_discount_amount, first_order_only, is_active, is_public)
VALUES
  ('ALMERA10', 'percentage', 10, 10000, 5000, true, true, true),
  ('FREEDELIVERY', 'free_delivery', 0, 12000, NULL, false, true, true),
  ('FESTIVE2500', 'fixed', 2500, 30000, NULL, false, true, false)
ON CONFLICT (code) DO NOTHING;
