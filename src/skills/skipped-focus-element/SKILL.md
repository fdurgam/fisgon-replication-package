---
name: Detection - Skipped Focus Element
description: Detects when a user navigates through a form and skips over visible interactive elements.
---
# Skipped Focus Element

Detects when a user navigates through a form and skips over visible interactive elements. For example, if focus moves from Field 1 to Field 3, bypassing Field 2 (which is visible and enabled), it indicates a non-linear or broken tab order.

## Accessibility Mapping
- **WCAG 2.4.3**: Focus Order (Level A) - If a Web page can be navigated sequentially and the navigation sequences affect meaning or operation, focusable components receive focus in an order that preserves meaning and operability.

## Capability
This skill analyzes the visual position of all focusable elements within a `<form>`. When a `focus` event occurs, it compares the current element with the previous one and flags any visible, enabled elements that were skipped in the visual sequence.

## Usage
1. Inject the script.
2. Tab through a form.
3. If an element is skipped (e.g., due to a `tabindex` higher than 0 or a CSS layout that doesn't match the DOM order), check the console for logs starting with `[Skipped Focus Element]`.
4. Review the `events` array in `window.AE["Skipped Focus Element"]`.
