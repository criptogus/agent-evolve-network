import { useState } from "react";
import type { LeadInput } from "@/lib/generate/lead";
import { isBusinessEmail } from "@/lib/generate/lead";

/* ---------- lead gate modal ---------- */

export function LeadGateModal({
  onClose,
  onUnlock,
}: {
  onClose: () => void;
  onUnlock: (lead: LeadInput) => Promise<void> | void;
}) {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!company.trim()) return setError("Company is required.");
    if (!role.trim()) return setError("Role is required.");
    const v = isBusinessEmail(email);
    if (!v.ok) return setError(v.reason ?? "Invalid email.");
    setBusy(true);
    try {
      await onUnlock({
        email: email.trim().toLowerCase(),
        domain: v.domain,
        company: company.trim(),
        role: role.trim(),
      });
    } catch {
      setError("Could not save your details. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Unlock the Trust Score report</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Single-skill reports are free. For multi-skill stacks, share your work email —
              we&apos;ll unlock the full PDF-grade report.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        </div>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <label className="block text-xs font-medium text-muted-foreground">
            Work email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={255}
              placeholder="you@company.com"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-muted-foreground">
              Company
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                maxLength={120}
                required
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <label className="block text-xs font-medium text-muted-foreground">
              Role
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                maxLength={120}
                required
                placeholder="Head of AI"
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <p className="text-[11px] text-muted-foreground">
            Free providers (gmail, yahoo, outlook, …) aren&apos;t accepted. We use your email only
            to send product updates — unsubscribe anytime.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-60"
            >
              {busy ? "Unlocking…" : "Unlock & download"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
