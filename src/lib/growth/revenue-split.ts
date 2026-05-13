// Revenue split engine. Given a paid sale (in cents) for a package, computes
// how it splits across: platform, author, referral (12-month window), and
// lineage upstream (one or more parents). Pure function — easy to test.

export interface SaleInput {
  amount_cents: number;
  currency?: string;
  package_id: string;
  author_user_id: string;
  source_payment_id: string;
  /** Optional: referral that brought the *author* to the platform. */
  referral?: { referrer_user_id: string; expires_at: string; rev_share_bps: number };
  /** Optional: upstream lineage (immediate parent → grandparent → ...). */
  lineage?: Array<{ parent_package_id: string; upstream_user_id: string; rev_share_bps: number }>;
  /** Platform take, default 15%. Must equal what author saw at publish time. */
  platform_bps?: number;
}

export interface PayoutLine {
  payee_user_id: string;
  kind: "platform" | "author" | "referral" | "lineage";
  amount_cents: number;
  notes?: string;
  package_id?: string;
}

const PLATFORM_USER = "platform";

export function splitRevenue(sale: SaleInput): PayoutLine[] {
  if (sale.amount_cents <= 0) return [];
  const platformBps = sale.platform_bps ?? 1500;
  const lines: PayoutLine[] = [];
  let remaining = sale.amount_cents;

  const platform = bps(sale.amount_cents, platformBps);
  lines.push({ payee_user_id: PLATFORM_USER, kind: "platform", amount_cents: platform });
  remaining -= platform;

  // Lineage takes from the author's pre-author share, deepest-first.
  let lineageTotal = 0;
  for (const node of sale.lineage ?? []) {
    if (!node.upstream_user_id || node.upstream_user_id === sale.author_user_id) continue;
    const amt = bps(sale.amount_cents, node.rev_share_bps);
    if (amt <= 0) continue;
    lines.push({
      payee_user_id: node.upstream_user_id,
      kind: "lineage",
      amount_cents: amt,
      notes: `lineage parent=${node.parent_package_id}`,
      package_id: sale.package_id,
    });
    lineageTotal += amt;
  }

  // Referral (12-month window from sign-up).
  let referralAmt = 0;
  if (sale.referral && new Date(sale.referral.expires_at).getTime() > Date.now()
      && sale.referral.referrer_user_id !== sale.author_user_id) {
    referralAmt = bps(sale.amount_cents, sale.referral.rev_share_bps);
    lines.push({
      payee_user_id: sale.referral.referrer_user_id,
      kind: "referral",
      amount_cents: referralAmt,
      notes: `referral 12mo window`,
      package_id: sale.package_id,
    });
  }

  const authorAmt = remaining - lineageTotal - referralAmt;
  if (authorAmt > 0) {
    lines.push({
      payee_user_id: sale.author_user_id,
      kind: "author",
      amount_cents: authorAmt,
      package_id: sale.package_id,
    });
  }
  return lines;
}

function bps(amount: number, bps: number): number {
  return Math.floor((amount * bps) / 10_000);
}

export function summarize(lines: PayoutLine[]) {
  const total = lines.reduce((s, l) => s + l.amount_cents, 0);
  const by_kind: Record<string, number> = {};
  for (const l of lines) by_kind[l.kind] = (by_kind[l.kind] ?? 0) + l.amount_cents;
  return { total, by_kind };
}
