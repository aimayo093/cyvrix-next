# Legal content publication gate

## Purpose

The public Privacy Policy, Terms of Service and Cookie Policy routes must not present a draft, a title list or internal CMS guidance as a final legal document.

## Public rendering rules

- A legal page is read only when its CMS status is `PUBLISHED`.
- The public renderer removes markup and displays plain paragraphs; it never renders CMS HTML directly.
- A record must contain substantive reviewed content before it is shown publicly. A title list, short placeholder or empty body shows the controlled publication notice instead.
- The public pages do not claim a certification, regulatory registration, cookie practice, response commitment or contractual term that has not been included in approved content.

## Before publication

- Obtain the final wording from the appropriate legal reviewer.
- Include the current legal entity details, contact route, effective date and any processing, cookie or contractual information required for the actual service model.
- In **Admin → Legal Pages**, choose the matching document, add the reviewed text and select `Publish to the public route`.
- Confirm that the exact wording has legal approval. The editor rejects publication without this confirmation and substantive content, but the confirmation does not replace the actual legal review.
- Verify the page in staging and confirm the reviewed text, title, any notice and canonical URL are correct.
- Verify `/privacy-policy`, `/terms` and `/cookie-policy` appear in the sitemap. Do not use a generic `/legal/...` URL unless a real route has been built for it.

## Release guardrail

Do not treat the controlled publication notice as an approved legal policy. It is deliberately transparent until the reviewed document is available.
