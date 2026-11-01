-- Links the listings that are colours of one item, so the product page can offer a colour choice.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS colour_group text;

CREATE INDEX IF NOT EXISTS products_colour_group_idx ON public.products (colour_group) WHERE colour_group IS NOT NULL;
