/**
 * Lightweight CMS HTML sanitizer (strip high-risk tags/handlers/schemes).
 * Defense in depth alongside server-side sanitize on published posts.
 */
export function sanitizeRichHtml(input: string): string {
  let html = String(input ?? '');
  if (!html) return '';

  html = html.replace(
    /<\s*(script|style|iframe|object|embed|form|link|meta|base|svg|math|template)(\s[^>]*)?>[\s\S]*?<\s*\/\s*\1\s*>/gi,
    '',
  );
  html = html.replace(
    /<\s*(script|style|iframe|object|embed|form|link|meta|base|svg|math|template)(\s[^>]*)?\/?\s*>/gi,
    '',
  );
  html = html.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  html = html.replace(
    /\s(href|src|xlink:href|action|formaction)\s*=\s*(['"])\s*(?:javascript|vbscript)\s*:[\s\S]*?\2/gi,
    ' $1="#"',
  );
  html = html.replace(
    /\s(href|src)\s*=\s*(['"])\s*data\s*:\s*text\/html[\s\S]*?\2/gi,
    ' $1="#"',
  );
  html = html.replace(/\s+srcdoc\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  return html;
}
