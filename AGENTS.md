<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Before changing this repository

Read `docs/DECISIONS.md` first. It records why the public claims are gated, why
some content lives in two places, why two details are withheld from the page
source, and how the Security Center scores itself. Several of those decisions
look arbitrary from the code alone and have been reversed by accident before.

`npm run check:claims` fails the build on unevidenced public claims. If it
blocks a change, the answer is almost never to weaken the rule.
