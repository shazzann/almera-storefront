import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin.server";

export type StockItem = {
  id: string;
  quantity: number;
  table: "products" | "product_variants";
  slug: string;
};

export async function deductStock(items: StockItem[]): Promise<void> {
  const supabase = getSupabaseAdmin();
  const deducted: StockItem[] = [];

  // Aggregate quantities if the same product/variant ID appears twice in the cart
  const aggregatedMap = new Map<string, StockItem>();
  for (const item of items) {
    const key = `${item.table}:${item.id}`;
    const existing = aggregatedMap.get(key);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      aggregatedMap.set(key, { ...item });
    }
  }

  // Sort deterministically by table and UUID to prevent database deadlocks
  const sortedItems = Array.from(aggregatedMap.values()).sort((a, b) => {
    const t = a.table.localeCompare(b.table);
    return t !== 0 ? t : a.id.localeCompare(b.id);
  });

  for (const item of sortedItems) {
    const { data, error } = await supabase.rpc("deduct_stock", {
      p_table: item.table,
      p_id: item.id,
      p_quantity: item.quantity,
    });

    if (error || data === false) {
      await restoreStock(deducted);
      throw new Error(
        error
          ? "Could not reserve inventory. Please try again."
          : "One or more items in your bag just sold out or have insufficient stock. Please review your bag.",
      );
    }
    deducted.push(item);
  }
}

export async function restoreStock(items: StockItem[]): Promise<void> {
  const supabase = getSupabaseAdmin();
  for (const item of items) {
    await supabase.rpc("restore_stock", {
      p_table: item.table,
      p_id: item.id,
      p_quantity: item.quantity,
    });
  }
}

