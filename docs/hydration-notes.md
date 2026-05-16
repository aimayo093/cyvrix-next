# Hydration Notes

React hydration warnings that mention attributes such as `data-new-gr-c-s-check-loaded`, `data-gr-ext-installed`, `cz-shortcut-listen`, or `data-lt-installed` are normally caused by browser extensions mutating the DOM before React hydrates.

Common sources include Grammarly, LanguageTool, ColorZilla, password managers, and other writing or productivity extensions. These attributes are not emitted by the CYVRIX app.

To confirm:

1. Open the app in an incognito/private window with extensions disabled.
2. Reload the same route.
3. If the warning disappears and only extension attributes were listed, the app is not the cause.

The app still keeps hydration-sensitive logic out of the initial render:

- Browser-only theme and scroll state are read after mount.
- The root layout uses `suppressHydrationWarning` on `<html>` and `<body>` only for unavoidable extension/theme attribute differences.
- Server-rendered JSX avoids random, time-based, locale-formatted, or browser-only values.
