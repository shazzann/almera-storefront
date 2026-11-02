-- Ensure storage bucket 'product-images' is public and accessible for anonymous edge CDN caching
UPDATE storage.buckets SET public = true WHERE id = 'product-images';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Public can view assets'
  ) THEN
    CREATE POLICY "Public can view assets"
      ON storage.objects FOR SELECT TO public
      USING (bucket_id = 'product-images');
  END IF;
END $$;

