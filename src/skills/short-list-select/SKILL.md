---
name: Detection - Short List Select
description: Detects select dropdown elements with fewer than 3 values, which should be radio buttons, checkboxes, or switch controls.
---
# Short List Select

Detects dropdown (select) elements that contain fewer than 3 real options (excluding placeholders). When a dropdown has 1 or 2 options, it increases cognitive load, screen reader verbosity, and keyboard navigation effort.

## Accessibility Mapping
- **WCAG 2.4.3**: Focus Order (Level A) - High keyboard navigation cost for simple choices.
- **Cognitive Accessibility**: Dropdowns hide choices, whereas radio buttons show choices upfront. Choosing between 2 options (like Yes/No) is much faster and clearer when choices are laid out as radio buttons or a toggle.

## Capability
This skill observes and inspects `<select>` elements:
1. When they are focused, clicked, or changed.
2. When their child `<option>` list is dynamically mutated (e.g., dynamically updated based on the selection in a parent dropdown).

If the number of non-placeholder options is exactly 1 or 2, it flags the select element as a "Short List Select" barrier.

## Usage
1. Inject the script.
2. Interact with forms that contain dropdowns (e.g. state/city selects, yes/no selects).
3. If a dropdown has fewer than 3 options, check the console for logs starting with `[Short List Select]`.
4. Review the `events` array in `window.AE["Short List Select"]`.
