interface JsonLdProps {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
}

/** Renders a JSON-LD <script> tag. Safe to use on the client and during SSR. */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
