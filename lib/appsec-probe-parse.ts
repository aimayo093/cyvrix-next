/**
 * Pure parsing for the live security probes, kept apart so it can be tested
 * against real page markup without a network.
 */

/**
 * Same-origin client bundles referenced by a page, as paths without a query.
 *
 * The hosting platform's skew protection appends `?dpl=<deployment>` to every
 * asset, so a pattern that expects `.js"` finds nothing and the source-map
 * check falls back to "not assessed" — which is what happened once the
 * project moved to a paid plan. The query is dropped because the source map, if one is served,
 * lives beside the file at `<path>.map`.
 */
export function clientBundlePaths(html: string, limit = 3): string[] {
  const paths = [...html.matchAll(/src="(\/_next\/static\/[^"?#]+\.js)(?:[?#][^"]*)?"/g)].map((match) => match[1]);
  return [...new Set(paths)].slice(0, limit);
}

/**
 * Log calls whose arguments name a credential-shaped value, as code.
 *
 * Text inside string literals is removed first, keeping only the `${...}`
 * expressions of template literals, so a message that merely mentions a word
 * ("[breached-passwords] lookup failed") is not mistaken for logging one.
 * Returns the offending call snippets.
 */
const CREDENTIAL_NAME = /\b\w*(password|secret|token|apikey|api_key|passwordhash|authorization)\w*\b/i;

/**
 * The source with every comment and the text of every string literal replaced
 * by spaces (same length, quotes kept), so the scan below sees only code.
 * Escapes are honoured, and a template literal's `${…}` expressions stay as
 * code, nested to any depth. Limit: regular-expression literals are not
 * recognised, so a quote or `//` inside one can mis-mask the rest of its line.
 */
export function maskNonCode(source: string): string {
  const out = source.split("");
  const blank = (from: number, to: number) => {
    for (let k = from; k < to; k += 1) if (out[k] !== "\n") out[k] = " ";
  };

  // Scans code from `start` until an unmatched "}" (when inside a template
  // expression) or the end. Returns the index just past where it stopped.
  const code = (start: number, inExpression: boolean): number => {
    let i = start;
    let braces = 0;
    while (i < source.length) {
      const ch = source[i];
      const next = source[i + 1];
      if (ch === "/" && next === "/") {
        const end = source.indexOf("\n", i);
        const stop = end === -1 ? source.length : end;
        blank(i, stop);
        i = stop;
      } else if (ch === "/" && next === "*") {
        const end = source.indexOf("*/", i + 2);
        const stop = end === -1 ? source.length : end + 2;
        blank(i, stop);
        i = stop;
      } else if (ch === '"' || ch === "'") {
        let j = i + 1;
        while (j < source.length && source[j] !== ch && source[j] !== "\n") j += source[j] === "\\" ? 2 : 1;
        blank(i + 1, Math.min(j, source.length));
        i = j + 1;
      } else if (ch === "`") {
        let j = i + 1;
        while (j < source.length && source[j] !== "`") {
          if (source[j] === "\\") {
            blank(j, j + 2);
            j += 2;
          } else if (source[j] === "$" && source[j + 1] === "{") {
            j = code(j + 2, true);
          } else {
            blank(j, j + 1);
            j += 1;
          }
        }
        i = j + 1;
      } else if (inExpression && ch === "{") {
        braces += 1;
        i += 1;
      } else if (inExpression && ch === "}") {
        if (braces === 0) return i + 1;
        braces -= 1;
        i += 1;
      } else {
        i += 1;
      }
    }
    return i;
  };

  code(0, false);
  return out.join("");
}

export function credentialLogCalls(rawSource: string): string[] {
  // Calls inside comments or strings are not calls, and an escaped quote must
  // not end a string early, so the scan runs on code only.
  const source = maskNonCode(rawSource);
  const found: string[] = [];
  const call = /console\.(log|error|warn|info|debug)\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = call.exec(source))) {
    // Walk to the matching close paren, skipping over strings.
    let depth = 1;
    let i = call.lastIndex;
    let code = "";
    while (i < source.length && depth > 0) {
      const ch = source[i];
      if (ch === '"' || ch === "'") {
        const end = source.indexOf(ch, i + 1);
        i = end === -1 ? source.length : end + 1;
        code += '""';
        continue;
      }
      if (ch === "`") {
        i += 1;
        while (i < source.length && source[i] !== "`") {
          if (source[i] === "\\") { i += 2; continue; }
          if (source[i] === "$" && source[i + 1] === "{") {
            let inner = 1;
            let j = i + 2;
            while (j < source.length && inner > 0) {
              if (source[j] === "{") inner += 1;
              else if (source[j] === "}") inner -= 1;
              j += 1;
            }
            code += ` ${source.slice(i + 2, j - 1)} `;
            i = j;
            continue;
          }
          i += 1;
        }
        i += 1;
        code += '""';
        continue;
      }
      if (ch === "(") depth += 1;
      else if (ch === ")") depth -= 1;
      if (depth > 0) code += ch;
      i += 1;
    }
    if (CREDENTIAL_NAME.test(code)) found.push(`console.${match[1]}(${code.trim().slice(0, 80)})`);
  }
  return found;
}
