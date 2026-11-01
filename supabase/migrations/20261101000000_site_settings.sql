-- Small owner-editable settings for the store, starting with the homepage hero.
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read site settings" ON public.site_settings;
CREATE POLICY "Public read site settings" ON public.site_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin full site settings" ON public.site_settings;
CREATE POLICY "Admin full site settings" ON public.site_settings FOR ALL
  USING (public.is_almera_admin()) WITH CHECK (public.is_almera_admin());
