"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  deleteCustomerAddressAction,
  getCustomerAddressesAction,
  upsertCustomerAddressAction,
} from "@/actions/auth";
import { AccountNav } from "@/components/account-nav";
import { DISTRICTS } from "@/lib/catalog";

export default function AccountAddressesPage() {
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAddress, setEditingAddress] = useState<any | null>(null);
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const loadAddresses = async () => {
    try {
      const data = await getCustomerAddressesAction();
      setAddresses(data);
    } catch {
      // non-blocking
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Remove this saved address?")) return;
    setBusy(true);
    setBanner(null);
    try {
      await deleteCustomerAddressAction(id);
      await loadAddresses();
      setBanner({ kind: "ok", text: "Address removed." });
    } catch (err) {
      setBanner({
        kind: "err",
        text: err instanceof Error ? err.message : "Failed to remove address.",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setBanner(null);

    try {
      await upsertCustomerAddressAction({
        id: editingAddress.id,
        label: editingAddress.label,
        recipientName: editingAddress.recipient_name,
        phone: editingAddress.phone,
        address: editingAddress.address,
        city: editingAddress.city,
        district: editingAddress.district,
        postalCode: editingAddress.postal_code,
        isDefault: editingAddress.is_default,
      });
      setEditingAddress(null);
      await loadAddresses();
      setBanner({ kind: "ok", text: "Address saved successfully." });
    } catch (err) {
      setBanner({
        kind: "err",
        text: err instanceof Error ? err.message : "Failed to save address.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-gold-deep">Wardrobe Addresses</p>
          <h1 className="display mt-1 text-4xl sm:text-5xl">saved addresses</h1>
          <p className="mt-1 text-xs text-ink/60">
            Speed up checkout by saving your home, office or tailor delivery addresses.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setEditingAddress({
              label: "Home",
              recipient_name: "",
              phone: "",
              address: "",
              city: "",
              district: DISTRICTS[0],
              postal_code: "",
              is_default: addresses.length === 0,
            })
          }
          className="btn btn-primary px-5 py-2 text-xs"
        >
          + Add new address
        </button>
      </div>

      <AccountNav />

      {banner && (
        <div
          className={`mt-6 rounded-xl p-3 text-xs ${
            banner.kind === "ok"
              ? "bg-sage-soft text-sage-deep"
              : "bg-[#a5432f]/10 text-[#a5432f]"
          }`}
        >
          {banner.text}
        </div>
      )}

      {/* Address Editor Modal / Form */}
      {editingAddress && (
        <div className="mt-6 rounded-2xl border border-line bg-ivory p-6">
          <div className="flex items-center justify-between">
            <h2 className="display text-2xl">
              {editingAddress.id ? "edit address" : "new address"}
            </h2>
            <button
              type="button"
              onClick={() => setEditingAddress(null)}
              className="text-xs underline"
            >
              Close
            </button>
          </div>

          <form onSubmit={handleSave} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold tracking-wider text-ink/65 uppercase">
                  Address Label
                </label>
                <input
                  type="text"
                  required
                  placeholder="Home, Office, etc."
                  value={editingAddress.label}
                  onChange={(e) =>
                    setEditingAddress({ ...editingAddress, label: e.target.value })
                  }
                  className="field"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold tracking-wider text-ink/65 uppercase">
                  Recipient Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Recipient Name"
                  value={editingAddress.recipient_name}
                  onChange={(e) =>
                    setEditingAddress({ ...editingAddress, recipient_name: e.target.value })
                  }
                  className="field"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold tracking-wider text-ink/65 uppercase">
                Contact Phone Number
              </label>
              <input
                type="tel"
                required
                placeholder="077 123 4567"
                value={editingAddress.phone}
                onChange={(e) =>
                  setEditingAddress({ ...editingAddress, phone: e.target.value })
                }
                className="field"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold tracking-wider text-ink/65 uppercase">
                House Number &amp; Street
              </label>
              <input
                type="text"
                required
                placeholder="No. 12, Galle Road"
                value={editingAddress.address}
                onChange={(e) =>
                  setEditingAddress({ ...editingAddress, address: e.target.value })
                }
                className="field"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold tracking-wider text-ink/65 uppercase">
                  City / Town
                </label>
                <input
                  type="text"
                  required
                  placeholder="Colombo 03"
                  value={editingAddress.city}
                  onChange={(e) =>
                    setEditingAddress({ ...editingAddress, city: e.target.value })
                  }
                  className="field"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold tracking-wider text-ink/65 uppercase">
                  District
                </label>
                <select
                  value={editingAddress.district}
                  onChange={(e) =>
                    setEditingAddress({ ...editingAddress, district: e.target.value })
                  }
                  className="field"
                >
                  {DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold tracking-wider text-ink/65 uppercase">
                  Postal Code (optional)
                </label>
                <input
                  type="text"
                  placeholder="00300"
                  value={editingAddress.postal_code || ""}
                  onChange={(e) =>
                    setEditingAddress({ ...editingAddress, postal_code: e.target.value })
                  }
                  className="field"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 pt-2 text-xs font-medium">
              <input
                type="checkbox"
                checked={Boolean(editingAddress.is_default)}
                onChange={(e) =>
                  setEditingAddress({ ...editingAddress, is_default: e.target.checked })
                }
              />
              Set as my default shipping address
            </label>

            <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
              <button
                type="button"
                onClick={() => setEditingAddress(null)}
                className="btn btn-ghost px-4 py-2 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="btn btn-primary px-5 py-2 text-xs disabled:opacity-60"
              >
                {busy ? "Saving…" : "Save address"}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="mt-8 text-center text-sm text-ink/60">Loading saved addresses…</div>
      ) : addresses.length === 0 ? (
        <div className="mt-8 rounded-2xl bg-ivory p-10 text-center">
          <p className="display text-3xl">no saved addresses</p>
          <p className="mt-2 text-sm text-ink/65">
            Save your home or delivery locations here for one-click checkout.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`flex flex-col justify-between rounded-2xl border bg-ivory p-5 transition ${
                addr.is_default ? "border-gold shadow-sm" : "border-line"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-ink">{addr.label || "Address"}</span>
                  {addr.is_default && (
                    <span className="rounded-full bg-gold/20 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-gold-deep uppercase">
                      Default
                    </span>
                  )}
                </div>
                <div className="mt-2 text-xs leading-relaxed text-ink/75">
                  <p className="font-medium text-ink">{addr.recipient_name}</p>
                  <p>{addr.address}</p>
                  <p>
                    {addr.city}, {addr.district} {addr.postal_code || ""}
                  </p>
                  <p className="mt-1 text-ink/60">{addr.phone}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-3 border-t border-line pt-3 text-xs">
                <button
                  type="button"
                  onClick={() => setEditingAddress(addr)}
                  className="font-medium underline underline-offset-4 hover:text-sage-deep"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleDelete(addr.id)}
                  className="text-[#a5432f] underline underline-offset-4"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

