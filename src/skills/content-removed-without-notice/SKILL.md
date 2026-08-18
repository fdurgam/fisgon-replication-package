---
name: Detection - Content Removed Without Notice
description: Detects when an interactive element is removed from the DOM while it currently has the keyboard focus.
---
# Content Removed Without Notice

Detects when an interactive element is removed from the DOM while it currently has the keyboard focus. This usually results in the focus being reset to the `body` element, causing a "Focus Loss" event that disorients screen reader users.

## Accessibility Mapping
- **WCAG 2.1.1**: Keyboard (Level A) - Focus must be managed predictably.
- **WCAG 4.1.2**: Name, Role, Value (Level A) - Sudden disappearance of components without announcement.

## Capability
This skill monitors `focusout` events and performs a deferred check to see if the element still exists in the document.

## Usage
1. Inject the script into the browser console or a test suite.
2. Interact with elements that might trigger dynamic removals (e.g., auto-closing notifications, immediate field removals).
3. Check the console for logs starting with `[Content Removed Without Notice]`.
