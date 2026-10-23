/** PostgreSQL tsvector is an internal index, not part of a serialized package. */
export function publicPackage<T extends { search_vector: unknown }>(
  pkg: T,
): Omit<T, "search_vector"> {
  const { search_vector: _searchVector, ...result } = pkg;
  return result;
}
