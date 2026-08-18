---
name: Detection - Re-enter Focus Form
description: Detects when a user begins interacting with a form, navigates away from it, and then returns.
---
# Re-enter Focus Form

Detects when a user begins interacting with a form, navigates away from it (to other parts of the page or other tabs), and then returns to the same form. Excessive re-entries suggest that the form is confusing, lacks necessary information, or requires data from other sources.

## Accessibility Mapping
- Monitors for high cognitive load and complexity barriers that might affect users with learning or attention disabilities.

## Capability
This skill tracks `focusout` and `focusin` events relative to `<form>` elements. It maintains a count of re-entries per form.

## Usage
1. Inject the script.
2. Focus an input in a form.
3. Click outside the form or focus an element in a different section.
4. Return to the form.
5. Check the console for logs starting with `[Re enter focus form]`.
