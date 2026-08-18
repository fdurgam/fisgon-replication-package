---
name: Detection - Misleading Speech Synthesis
description: Detects semantic inconsistencies and stale attributes where the screen reader (SR) voice synthesis contradicts or confuses the visual layout of the interface.
---
# Misleading Speech Synthesis

Detects situations where screen reader speech synthesis does not align with visual rendering, potentially misleading blind or low-vision users.

## Accessibility Mapping
- **WCAG 4.1.2**: Name, Role, Value (Level A) - Ensure controls have accessible names and states.
- **WCAG 1.3.1**: Info and Relationships (Level A) - Information, structure, and relationships conveyed through presentation can be programmatically determined or are available in text.

## Capability
This skill monitors:
1. **Stale Hidden Text**: Checks if the content of `.sr-only` elements mismatches visual rendering.
2. **Visual Semantic Mismatch**: Checks if the accessible name of an element contradicts the visual label/purpose.
3. **Stale Accessibility State**: Evaluates if the accessibility state (`aria-expanded`, `aria-selected`, `aria-disabled`) mismatches the active visual CSS class/states.
