---
name: Detection - Form Submission Accessibility
description: Monitors the lifecycle of form submissions to detect accessibility barriers during data entry.
---
# Form Submission Accessibility

Monitors the lifecycle of form submissions to detect accessibility barriers during data entry. It identifies cases where a form is submitted but doesn't transition (silent failure), or where validation blocks the user without a clear status change.

## Accessibility Mapping
- **WCAG 3.3.1**: Error Identification (Level A) - If an input error is detected, the item is identified and the error is described in text.
- **WCAG 3.3.3**: Error Suggestion (Level AA) - Assistance for correcting the error.

## Capability
This skill uses `localStorage` to persist submission attempts across page reloads. It calculates a DOM hash to determine if the page content changed after a submission. If the DOM is identical and no navigation occurred, it flags a "Post-Reload Failure" or "Client-Side Block".

## Usage
1. Inject the script.
2. Submit a form that has validation (e.g., leaving a required field empty).
3. Check the console for logs starting with `[Form Submission Accessibility]`.
