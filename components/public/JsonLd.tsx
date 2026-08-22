import { jsonLdString, type JsonLdObject } from "@/lib/structured-data";

/**
 * Renders one or more schema.org graphs into the document.
 *
 * A plain <script> rather than next/script: structured data has to be present
 * in the server-rendered HTML for crawlers that do not execute JavaScript, and
 * next/script's default strategy defers it.
 */
export function JsonLd({ schema }: { schema: JsonLdObject | JsonLdObject[] | null }) {
  if (!schema || (Array.isArray(schema) && schema.length === 0)) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdString(schema) }}
    />
  );
}
