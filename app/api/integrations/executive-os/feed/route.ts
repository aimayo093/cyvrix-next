/**
 * GET /api/integrations/executive-os/feed — the original path of the feed, kept
 * as an alias so anything already polling it keeps working. Same handler and
 * same read token as /api/integrations/paperclip/feed.
 */
export { GET } from "@/app/api/integrations/paperclip/feed/route";
