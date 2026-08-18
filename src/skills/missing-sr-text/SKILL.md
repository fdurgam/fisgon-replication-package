---
name: Detection - Missing SR Text
description: Detects interactive and informative non-text elements (like images, icon buttons, and custom controls) that lack an accessible text alternative.
---
# Missing SR Text

Detects user interface elements (such as functional images, status icons, graphical buttons, or dynamic components) that lack an accessible textual alternative. This makes them "invisible" or mute to screen readers, preventing users from understanding their purpose or action.

## Accessibility Mapping
- **WCAG 1.1.1**: Non-text Content (Level A) - All non-text content presented to the user has a text alternative that serves the equivalent purpose.
- **WCAG 4.1.2**: Name, Role, Value (Level A) - Ensure the accessible name of any interactive control can be programmatically determined.

## Capability
This skill scans and analyzes the accessibility properties of rendered elements at runtime (focusin, click, mutations, or initial scan):
1. **Unlabelled Image / Icon**: An `<img>` element lacks an `alt` attribute (or it is empty and the image is not marked as decorative using `role="presentation"` or `aria-hidden="true"`). Or a standalone `<svg>` element has no title, label, or hidden state.
2. **Mute Interactive Control**: A `<button>`, `<a href>`, or element with `role="button"` (or click listener) has no visible text and lacks any accessible name (`aria-label`, `aria-labelledby`, `title`).
3. **Muted Focusable Element**: An element is focusable (e.g. `tabindex="0"`, or interactive tags) but is hidden from the accessibility tree via `aria-hidden="true"`, rendering it "invisible" yet keyboard-reachable.

## Usage
1. Inject the script.
2. Interact with buttons, links, icons, or images.
3. If an element lacks accessible text, check the console for logs starting with `[Missing SR Text]`.
4. Review the `events` array in `window.AE["Missing SR Text"]`.
