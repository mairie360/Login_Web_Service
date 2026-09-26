/** Parse an explicitly configured frontend destination without inventing a host. */
export function parseFrontUrl(value: string | undefined): URL | undefined {
  if (!value?.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      return undefined;
    }
    return url;
  } catch {
    return undefined;
  }
}
