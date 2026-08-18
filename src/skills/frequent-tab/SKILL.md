---
name: Detection - Frequent Tab
description: Detects pages or forms requiring an excessive number of sequential Tab presses to navigate, indicating a lack of skip links, poor page layout, or keyboard focus traps.
---
# Frequent Tab

Detects keyboard navigation fatigue caused by an excessive number of sequential Tab key presses. This occurs when an interface lacks skip links (bypass blocks), has redundant navigation elements that cannot be skipped, or forces the user through a long, repetitive tab sequence to reach primary actions.

## Accessibility Mapping
- **WCAG 2.4.1**: Bypass Blocks (Level A) - A mechanism is available to bypass blocks of content that are repeated on multiple Web pages.
- **WCAG 2.4.3**: Focus Order (Level A) - Focusable components receive focus in an order that preserves meaning and operability.

## Capability
This skill monitors keyboard tab interactions:
1. **High Tab Count**: Counts sequential `Tab` key presses. If the user tabs more than 15 consecutive times without interacting with a form element (e.g. typing, clicking, submitting) or triggering a successful page change, it flags navigation fatigue.
2. **Keyboard Focus Loop**: Detects if focus moves in a repetitive loop among the same elements while the user continues to press Tab, indicating a keyboard trap or focus loop.

## Usage
1. Inject the script.
2. Tab through a page or a long navigation menu.
3. If the Tab count exceeds the threshold (e.g., 15 tabs without meaningful interaction), check the console for logs starting with `[Frequent Tab]`.
4. Review the `events` array in `window.AE["Frequent Tab"]`.
