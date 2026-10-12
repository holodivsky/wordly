const SUGGESTION_LIMIT = 6;

/**
 * Word completions for what the user has typed so far, from Wiktionary's free
 * prefix search (German or Ukrainian, picked by the script of the input).
 * Suggestions are a nicety, so any failure just yields none.
 */
export async function suggestWords(prefix: string, signal: AbortSignal): Promise<string[]> {
  const lang = /[а-яіїєґ]/i.test(prefix) ? 'uk' : 'de';
  const params = new URLSearchParams({
    action: 'opensearch',
    search: prefix,
    limit: String(SUGGESTION_LIMIT),
    namespace: '0',
    format: 'json',
    origin: '*',
  });
  try {
    const response = await fetch(`https://${lang}.wiktionary.org/w/api.php?${params}`, { signal });
    if (!response.ok) return [];
    const data: unknown = await response.json();
    const titles = Array.isArray(data) ? data[1] : null;
    return Array.isArray(titles) ? titles.filter((t): t is string => typeof t === 'string') : [];
  } catch {
    return [];
  }
}
