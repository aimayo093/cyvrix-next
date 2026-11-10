/**
 * A CMS record or JSON blob as the renderers read it.
 *
 * Section settings, content blocks and CMS rows are JSON an administrator
 * edits, and their shape varies by section type. The renderers read optional
 * fields and fall back when one is missing; a strict type per section would be
 * a large refactor of components that work today. This one alias is the only
 * place the looseness is declared, so it stays visible rather than scattered.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
export type CmsJson = Record<string, any>;
