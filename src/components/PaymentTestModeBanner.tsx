const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;
const testModeFlag = import.meta.env.VITE_PAYMENTS_TEST_MODE as string | undefined;

/**
 * Renders only when payments are explicitly in test/preview mode:
 * requires VITE_PAYMENTS_TEST_MODE === "true" AND a test-mode client token.
 * Defaults to hidden in production.
 */
export function PaymentTestModeBanner() {
  if (testModeFlag !== "true") return null;
  if (!clientToken?.startsWith("pk_test_")) return null;
  return (
    <div className="w-full border-b border-orange-300 bg-orange-100 px-4 py-2 text-center text-sm text-orange-800">
      All payments made in the preview are in test mode.{" "}
      <a
        href="https://docs.lovable.dev/features/payments#test-and-live-environments"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium underline"
      >
        Read more
      </a>
    </div>
  );
}
