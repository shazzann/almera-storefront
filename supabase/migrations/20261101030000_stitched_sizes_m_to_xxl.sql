-- Stitched pieces now come in M, L, XL and XXL only. Denim waist sizes are untouched.
ALTER TABLE public.products ALTER COLUMN sizes SET DEFAULT ARRAY['M', 'L', 'XL', 'XXL'];
ALTER TABLE public.orders ALTER COLUMN delivery_fee SET DEFAULT 550;

-- XS and S stay in the table, switched off, because past orders point at them and cancelling
-- one of those orders puts its stock back there. The stock trigger stops counting them.
UPDATE public.product_variants v
   SET is_active = false
  FROM public.products p
 WHERE p.id = v.product_id
   AND v.stitching = 'stitched'
   AND v.size IN ('XS', 'S')
   AND p.sizes && ARRAY['XS', 'S'];

-- Products that track stock per size get an XXL row at zero, ready for the shop to fill in.
INSERT INTO public.product_variants (product_id, stitching, size, stock, is_active, sort_order)
SELECT DISTINCT v.product_id, 'stitched', 'XXL', 0, true, 6
  FROM public.product_variants v
  JOIN public.products p ON p.id = v.product_id
 WHERE v.stitching = 'stitched'
   AND p.sizes && ARRAY['XS', 'S']
ON CONFLICT (product_id, stitching, size) DO NOTHING;

UPDATE public.products
   SET sizes = ARRAY['M', 'L', 'XL', 'XXL'], updated_at = now()
 WHERE sizes && ARRAY['XS', 'S'];
