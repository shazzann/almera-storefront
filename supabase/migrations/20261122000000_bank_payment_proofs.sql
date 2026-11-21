-- ============================================================================
-- ALMERA STOREFRONT — BANK PAYMENT PROOF UPLOAD, 1-HOUR HOLD & 10-DAY PURGE
-- ============================================================================

-- 1. Add payment proof tracking columns to public.orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_proof_path text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_proof_mime text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_proof_confirmed_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS payment_proof_purged_at timestamptz DEFAULT NULL;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_proof_mime_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_proof_mime_check
  CHECK (
    payment_proof_mime IS NULL OR
    payment_proof_mime IN ('image/webp', 'image/jpeg', 'image/png', 'application/pdf')
  );

CREATE INDEX IF NOT EXISTS orders_payment_proof_purge_idx
  ON public.orders (payment_proof_confirmed_at)
  WHERE payment_proof_path IS NOT NULL;

-- 2. Create private storage bucket for bank payment proofs (< 1 MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  false,
  1048576,
  ARRAY['image/webp', 'image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Admin full payment-proofs" ON storage.objects;
CREATE POLICY "Admin full payment-proofs"
  ON storage.objects FOR ALL
  USING (bucket_id = 'payment-proofs' AND public.is_almera_admin())
  WITH CHECK (bucket_id = 'payment-proofs' AND public.is_almera_admin());
