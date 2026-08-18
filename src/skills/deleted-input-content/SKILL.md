---
name: Detection - Deleted Input Content
description: Detects when a user has entered content into a text field or textarea, but that content is deleted or cleared unexpectedly.
---
# Deleted Input Content

Detects when a user has entered content into a text field or textarea, but that content is deleted or cleared (e.g., by a script or validation reset) by the time the user moves focus away from the field.

## Accessibility Mapping
- **WCAG 3.3.4**: Error Prevention (Level AA/AAA) - Users should not lose data unintentionally.

## Capability
This skill uses a `WeakMap` to track the state of individual DOM elements. It flags if a field that once contained text becomes empty upon `focusout`.

## Usage
1. Inject the script.
2. Type something into an input field or textarea.
3. Simulate an action that might clear the input (e.g., clicking outside if there's a buggy auto-formatter).
4. Check the console for logs starting with `[Deleted Input Content]`.
