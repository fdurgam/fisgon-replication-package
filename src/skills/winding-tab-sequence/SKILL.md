---
name: Detection - Winding Tab Sequence
description: Detects accessibility issues where the focus order is not linear (e.g., jumping back up the page without Shift+Tab).
---
# Winding Tab Sequence (WTS) Detector

This skill identifies accessibility barriers related to **WCAG 2.4.3 (Focus Order)**. It monitors the sequence of focused elements and flags any "upward" jumps (reverse vertical flow) larger than a configurable tolerance.

## Core Logic
- Tracks `focus` events and calculates the screen coordinates.
- If a focus point is >40px (default) above the previous point (and Shift is NOT pressed), it captures a "Before" and "After" snapshot.
- Draws a visual "Breadcrumb" trail on the page.

## Components
- `scripts/detect-wts.js`: The main detection engine.
- `examples/report_sample.md`: Example of a generated accessibility report.

## How to Run
In an active browser session with Playwright:
1. Inject `html2canvas` library.
2. Execute the content of `scripts/detect-wts.js`.
3. Simulate `Tab` navigation.
