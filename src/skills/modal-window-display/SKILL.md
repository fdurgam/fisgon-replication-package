---
name: Detection - Modal Window Display
description: Detects when an element appears visually as a modal window or overlay but lacks the required accessibility semantics.
---
# Modal Window Display

Detects when an element appears visually as a modal window or overlay (using high z-index, fixed/absolute positioning, and significant size) but lacks the required accessibility semantics.

## Accessibility Mapping
- **WCAG 2.4.3**: Focus Order (Level A) - Modals must manage focus correctly; lack of semantics often leads to focus leaks.
- **WCAG 4.1.2**: Name, Role, Value (Level A) - Components must provide their role (e.g., `role="dialog"`).

## Capability
This skill uses a `MutationObserver` to watch for style and attribute changes. it checks if a newly visible floating element has an appropriate role (`dialog`, `alertdialog`) or `aria-modal="true"`.

## Usage
1. Inject the script.
2. Trigger a modal or popup in the application.
3. Check the console for logs starting with `[Modal Window Display]`.
