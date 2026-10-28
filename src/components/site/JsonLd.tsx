import { useRouter } from "@tanstack/react-router";

interface JsonLdProps {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
}

/** Renders a JSON-LD <script> tag. Safe to use on the client and during SSR. */
export function JsonLd({ data }: JsonLdProps) {
  const router = useRouter();
  return (
    <script
      nonce={router.options.ssr?.nonce}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\u003c") }}
    />
  );
}
