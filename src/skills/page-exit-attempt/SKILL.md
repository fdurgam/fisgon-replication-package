---
name: Detection - Page Exit Attempt
description: Records the user's intention to leave the current page or navigate to a different section.
---
# Page Exit Attempt

Records the user's intention to leave the current page or navigate to a different section. This skill is useful for identifying context changes or cases where a user might be trying to "escape" a confusing or inaccessible interface.

## Accessibility Mapping
- Monitors for sudden context changes that might affect users with cognitive disabilities or users using assistive technology who need continuity.

## Capability
This skill hooks into several browser events and APIs:
- `click` (on links and buttons)
- `submit` (forms)
- `pushState` / `replaceState` (SPA navigation)
- `beforeunload` (browser exit/reload)

## Usage
1. Inject the script.
2. Click a link, submit a form, or use the browser's back/forward buttons.
3. Check the console for logs starting with `[Page Exit Attempt]`.
4. Review the `events` array in `window.AE["Page Exit Attempt"]`.
