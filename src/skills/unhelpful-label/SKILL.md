---
name: Detection - Unhelpful Label
description: Detects missing, broken, or unhelpful label associations on form input elements (inputs, textareas, selects).
---
# Unhelpful Label

Detects incorrect, missing, or weakly associated form labels. This occurs when form fields lack accessible names, when a `<label>` is not programmatically linked to its input (mismatch between label's `for` and input's `id`), or when placeholders or generic divs/spans are used visually without proper ARIA markup.

## Accessibility Mapping
- **WCAG 1.3.1**: Info and Relationships (Level A) - Information, structure, and relationships conveyed through presentation can be programmatically determined or are available in text.
- **WCAG 3.3.2**: Labels or Instructions (Level A) - Labels or instructions are provided when content requires user input.
- **WCAG 4.1.2**: Name, Role, Value (Level A) - Input elements must have programmatically determinable accessible names.

## Capability
This skill scans input, textarea, and select elements on the page (focus/clicks, mutations, or initial scan):
1. **Missing Label / Accessible Name**: The input has no label, no `aria-label`, no `aria-labelledby`, and no title attribute.
2. **Broken Label Association**: A `<label>` exists visually or in the DOM but has a `for` attribute that does not match the input's `id`, or the input's `id` does not match any label's `for`.
3. **Placeholder / Generic Label Abuse**: The input relies solely on a placeholder for description, or a nearby `<span>`/`<div>` is used as a visual label but lacks a programmatic association (e.g. no `aria-labelledby` linking it to the input).

## Usage
1. Inject the script.
2. Interact with forms containing input fields.
3. If an input field has an unhelpful or broken label, check the console for logs starting with `[Unhelpful Label]`.
4. Review the `events` array in `window.AE["Unhelpful Label"]`.
