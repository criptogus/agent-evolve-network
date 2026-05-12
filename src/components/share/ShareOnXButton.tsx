import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getSharePromo } from "@/lib/share/share-promo.functions";

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

export function ShareOnXButton({
  slug,
  type,
  name,
  description,
  url,
  variant = "button",
  className = "",
}: Props) {
  const fetchPromo = useServerFn(getSharePromo);
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    const absUrl = absolutize(url);
    let text: string;
    try {
      const res = await fetchPromo({ data: { slug, type, name, description, url: absUrl } });
      text = res.text;
    } catch {
      text = `🚀 ${name}\n\n${description}\n\n#AI #Agents #SuperAgentSkill\n${absUrl}`;
    } finally {
      setLoading(false);
    }
    const intent = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(intent, "_blank", "noopener,noreferrer");
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        title="Share on X"
        aria-label="Share on X"
        className={`inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50 ${className}`}
      >
        <XLogo className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={`inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50 ${className}`}
    >
      <XLogo className="h-3.5 w-3.5" />
      <span>{loading ? "Generating…" : "Share on X"}</span>
    </button>
  );
}

function XLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="currentColor"
      className={className}
    >
      <path d="M18.244 2H21.5l-7.51 8.58L22.75 22h-6.86l-5.37-7.02L4.4 22H1.14l8.04-9.19L1.5 2h6.97l4.86 6.43L18.244 2zm-2.4 18h1.86L7.27 4H5.3l10.544 16z" />
    </svg>
  );
}
