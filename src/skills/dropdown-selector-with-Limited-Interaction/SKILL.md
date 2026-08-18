---
name: Detection - Dropdown Selector with Limited Interaction
description: Detects custom JavaScript-controlled dropdowns where visual changes (like selection or focus highlighting) are not correctly reflected in the accessibility tree (missing ARIA attributes like aria-selected or aria-activedescendant).
---
# Dropdown Selector with Limited Interaction

Detects accessibility tree mismatches in custom JavaScript-controlled dropdown components (comboboxes/listboxes). This occurs when visual state changes (like marking an option as active, highlighted, or selected via color, border, or animations) are not synchronized with semantic ARIA states.

## Accessibility Mapping
- **WCAG 4.1.2**: Name, Role, Value (Level A) - Custom widgets must expose their role, state, and value to assistive technologies.
- **WCAG 2.1.1**: Keyboard (Level A) - Custom components must be operable via a keyboard.

## Capability
This skill monitors custom dropdown elements (elements with role `combobox`, `listbox`, or common dropdown classes/attributes) and their child options (elements with role `option` or custom option classes/attributes):
1. **Selection State Mismatch**: An option is visually selected (e.g., has classes containing `selected`, `active`, `highlighted`) but lacks `aria-selected="true"`.
2. **Active Descendant Mismatch**: A custom dropdown changes its visual active option, but the parent's `aria-activedescendant` attribute is missing, empty, or points to a non-existent element.
3. **Focus Synchronization Mismatch**: The dropdown options are visible and navigable visually, but do not update keyboard focus states or lack proper `tabindex`/role attributes.

If any of these discrepancies are found during user interaction or DOM mutations, the element is flagged.

## Usage
1. Inject the script.
2. Interact with custom JavaScript-controlled dropdowns (e.g., custom Autocompletes, Select2/React-Select copies).
3. If the dropdown has a mismatch, check the console for logs starting with `[Limited Interaction Dropdown]`.
4. Review the `events` array in `window.AE["Limited Interaction Dropdown"]`.
