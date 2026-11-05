/** Parse before comparing: prefix checks accept lookalike domains and credentials. */
export function validateExternalUrl(value: string, allowedOrigin: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.origin !== allowedOrigin || url.username || url.password)
      return null;
    return url.href;
  } catch {
    return null;
  }
}
