export function getNormalizedMalformedOauthAuthorizeUrl(
  locationLike?: Pick<Location, "pathname" | "search" | "hash">,
) {
  const loc = locationLike ?? (typeof window !== "undefined" ? window.location : null);
  if (!loc) return null;

  const { pathname, search, hash } = loc;
  const lowerPathname = pathname.toLowerCase();
  const markers = ["/oauth/authorize%3f", "/oauth/authorize%253f"];
  const marker = markers.find((m) => lowerPathname.startsWith(m));
  if (!marker) return null;

  const queryFromPath = pathname.slice(marker.length);
  if (!queryFromPath) return null;

  const queryFromSearch = search.startsWith("?") ? search.slice(1) : search;
  const normalizedQuery = [queryFromPath, queryFromSearch].filter(Boolean).join("&");
  return `/oauth/authorize?${normalizedQuery}${hash ?? ""}`;
}