import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getSharePromo } from "@/lib/share/share-promo.functions";
import { useAuth } from "@/hooks/use-auth";
import { getMyReferralStats } from "@/lib/referrals/referrals.functions";
import { withRef } from "@/lib/referrals/capture";

type Props = {
  slug: string;
  type: "skill" | "playbook" | "soul" | "guardrail" | "pack";
  name: string;
  description: string;
  url: string;
  variant?: "button" | "icon";
  className?: string;
};

const SITE_ORIGIN =
  typeof window !== "undefined" ? window.location.origin : "https://www.superagentskill.com";

function absolutize(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
}

export function ShareMenu({
  slug,
  type,
  name,
  description,
  url,
  variant = "button",
  className = "",
}: Props) {
  const { user } = useAuth();
  const fetchPromo = useServerFn(getSharePromo);
  const fetchStats = useServerFn(getMyReferralStats);
  const [open, setOpen] = useState(false);
  const [refCode, setRefCode] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Fetch referral code (once user known) when menu first opens
  useEffect(() => {
    if (!open || refCode || !user) return;
    fetchStats()
      .then((s) => {
        if (s?.referral_code) setRefCode(s.referral_code);
      })
      .catch(() => {});
  }, [open, user, refCode, fetchStats]);

  // Fetch AI promo text when menu opens
  useEffect(() => {
    if (!open || text) return;
    setLoading(true);
    const absUrl = withRef(absolutize(url), refCode);
    fetchPromo({ data: { slug, type, name, description, url: absUrl } })
      .then((res) => setText(res.text))
      .catch(() => {
        setText(`🚀 ${name}\n\n${description}\n\n#AI #Agents #SuperAgentSkill\n${absUrl}`);
      })
      .finally(() => setLoading(false));
  }, [open, text, slug, type, name, description, url, refCode, fetchPromo]);

  const shareUrl = withRef(absolutize(url), refCode);
  const shareText = text ?? `${name} — ${description}`;

  const channels = [
    {
      label: "X (Twitter)",
      icon: <XLogo className="h-3.5 w-3.5" />,
      href: `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
    },
    {
      label: "LinkedIn",
      icon: <LinkedInLogo className="h-3.5 w-3.5" />,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    },
    {
      label: "Reddit",
      icon: <RedditLogo className="h-3.5 w-3.5" />,
      href: `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(name)}`,
    },
    {
      label: "WhatsApp",
      icon: <WhatsAppLogo className="h-3.5 w-3.5" />,
      href: `https://wa.me/?text=${encodeURIComponent(shareText)}`,
    },
    {
      label: "Facebook",
      icon: <FacebookLogo className="h-3.5 w-3.5" />,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    },
    {
      label: "Telegram",
      icon: <TelegramLogo className="h-3.5 w-3.5" />,
      href: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
    },
    {
      label: "Email",
      icon: <MailLogo className="h-3.5 w-3.5" />,
      href: `mailto:?subject=${encodeURIComponent(name)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`,
    },
  ];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied" + (refCode ? " — earns you credits" : ""));
    } catch {
      toast.error("Could not copy");
    }
  };

  const trigger =
    variant === "icon" ? (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        title="Share"
        aria-label="Share"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:text-primary ${className}`}
      >
        <ShareIcon className="h-3.5 w-3.5" />
      </button>
    ) : (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary ${className}`}
      >
        <ShareIcon className="h-3.5 w-3.5" />
        <span>Share & earn</span>
      </button>
    );

  return (
    <div ref={ref} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      {trigger}
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-72 origin-top-right rounded-lg border border-border bg-background p-2 shadow-elevated"
        >
          <div className="px-2 pb-2 pt-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Share & earn credits
            </div>
            {user ? (
              refCode ? (
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Your code <span className="font-mono text-foreground">{refCode}</span> is added
                  automatically — every new subscriber earns you credits.
                </div>
              ) : (
                <div className="mt-1 text-[11px] text-muted-foreground">Loading your link…</div>
              )
            ) : (
              <div className="mt-1 text-[11px] text-muted-foreground">
                <a href="/signup" className="underline-offset-2 hover:underline">Sign up</a> to earn credits when others subscribe.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-0.5">
            {channels.map((c) => (
              <a
                key={c.label}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
              >
                <span className="flex h-5 w-5 items-center justify-center text-muted-foreground">
                  {c.icon}
                </span>
                <span>{c.label}</span>
                {loading && <span className="ml-auto text-[10px] text-muted-foreground">…</span>}
              </a>
            ))}
            <button
              type="button"
              onClick={copyLink}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
            >
              <span className="flex h-5 w-5 items-center justify-center text-muted-foreground">
                <CopyIcon className="h-3.5 w-3.5" />
              </span>
              <span>Copy link</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- icons ---------- */

function ShareIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}
function CopyIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}
function XLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className={className}>
      <path d="M18.244 2H21.5l-7.51 8.58L22.75 22h-6.86l-5.37-7.02L4.4 22H1.14l8.04-9.19L1.5 2h6.97l4.86 6.43L18.244 2zm-2.4 18h1.86L7.27 4H5.3l10.544 16z" />
    </svg>
  );
}
function LinkedInLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.28 2.38 4.28 5.47v6.27zM5.34 7.43a2.06 2.06 0 11.02-4.12 2.06 2.06 0 01-.02 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
    </svg>
  );
}
function RedditLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M22 12.07a2.07 2.07 0 00-3.5-1.49 10.14 10.14 0 00-5.4-1.71l.92-4.32 3 .64a1.5 1.5 0 102.07-1.94 1.5 1.5 0 00-2.61.85l-3.36-.71a.49.49 0 00-.58.38l-1.04 4.86A10.14 10.14 0 005.5 10.58a2.07 2.07 0 10-2.42 3.31 4.07 4.07 0 00-.05.66c0 3.36 3.92 6.09 8.74 6.09s8.74-2.73 8.74-6.09c0-.22-.02-.44-.05-.66A2.06 2.06 0 0022 12.07zM7.5 13.5A1.5 1.5 0 119 15a1.5 1.5 0 01-1.5-1.5zm8.49 4.06a5.7 5.7 0 01-7.98 0 .5.5 0 01.71-.71 4.7 4.7 0 006.56 0 .5.5 0 11.71.71zM15 15a1.5 1.5 0 111.5-1.5A1.5 1.5 0 0115 15z" />
    </svg>
  );
}
function WhatsAppLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.52 3.48A11.94 11.94 0 0012 0C5.37 0 0 5.37 0 12a11.93 11.93 0 001.64 6L0 24l6.16-1.61A12 12 0 0012 24c6.63 0 12-5.37 12-12 0-3.2-1.25-6.21-3.48-8.52zM12 22a9.94 9.94 0 01-5.07-1.39l-.36-.21-3.66.96.98-3.57-.24-.37A9.94 9.94 0 012 12c0-5.51 4.49-10 10-10s10 4.49 10 10-4.49 10-10 10zm5.45-7.55c-.3-.15-1.77-.87-2.04-.97s-.47-.15-.67.15-.77.97-.94 1.17-.35.22-.65.07a8.13 8.13 0 01-2.4-1.48 9 9 0 01-1.66-2.07c-.17-.3 0-.45.13-.6.13-.13.3-.35.45-.52a2 2 0 00.3-.5.55.55 0 000-.52c-.07-.15-.67-1.62-.92-2.22s-.49-.5-.67-.51h-.57a1.1 1.1 0 00-.8.37 3.34 3.34 0 00-1.04 2.49 5.8 5.8 0 001.21 3.07c.15.2 2.1 3.2 5.08 4.49a17.42 17.42 0 001.69.62 4.07 4.07 0 001.86.12 3.05 3.05 0 002-1.41 2.47 2.47 0 00.17-1.41c-.07-.13-.27-.2-.57-.35z" />
    </svg>
  );
}
function FacebookLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.13 8.44 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.24.19 2.24.19v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99C18.34 21.13 22 16.99 22 12z" />
    </svg>
  );
}
function TelegramLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
    </svg>
  );
}
function MailLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 6l-10 7L2 6" />
    </svg>
  );
}
