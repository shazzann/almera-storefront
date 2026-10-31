-- ============================================================================
-- ALMERA STOREFRONT — PAYMENTS.LK CARD CHECKOUT & INVENTORY HOLD MIGRATION
-- ============================================================================

-- 1. Ensure public.orders has stock_reserved and hold_expires_at columns
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stock_reserved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hold_expires_at timestamptz DEFAULT NULL;

-- 2. Ensure idempotency_key allows arbitrary text (e.g. order-UUID, UUID, or external refs)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'orders'
       AND column_name = 'idempotency_key'
       AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.orders ALTER COLUMN idempotency_key TYPE text;
  END IF;
END $$;

-- 3. Ensure payment_method check allows 'card'
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('cod', 'bank', 'card'));

-- 4. Ensure status check includes payment_pending, paid, pending, processing_failed, cancelled
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (
    status IN (
      'pending',
      'awaiting_bank_slip',
      'payment_pending',
      'payment_processing',
      'paid',
      'confirmed',
      'shipped',
      'delivered',
      'cancelled',
      'processing_failed',
      'partially_refunded',
      'refunded'
    )
  );

-- 5. Index for fast querying of expired 15-minute stock holds
CREATE INDEX IF NOT EXISTS orders_hold_expires_idx
  ON public.orders (hold_expires_at)
  WHERE status = 'payment_pending' AND stock_reserved = true;

-- 6. Index for payment_id lookups
CREATE INDEX IF NOT EXISTS orders_payment_id_idx
  ON public.orders (payment_id)
  WHERE payment_id IS NOT NULL;

