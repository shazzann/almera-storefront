"use server";

import type { Product } from "@/lib/catalog";
import { getFilteredProducts } from "@/lib/catalog.server";

export async function searchProductsAction(query: string): Promise<Product[]> {
  const term = query.trim();
  if (!term) return [];
  return getFilteredProducts({ q: term });
}

