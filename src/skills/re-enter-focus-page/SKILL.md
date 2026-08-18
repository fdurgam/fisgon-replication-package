---
name: Detection - Re-enter Focus Page
description: Detects when a user leaves the current browser window or tab and returns to it later.
---
# Re-enter Focus Page

Detects when a user leaves the current browser window or tab and returns to it later. High frequency of tab switching can indicate that the user is frequenting external documentation, seeking help elsewhere, or is being distracted by the application's complexity.

## Accessibility Mapping
- Monitors for cognitive friction and task abandonment risks.

## Capability
This skill monitors window-level `blur` and `focus` events. It maintains a count of how many times the user has "returned" to the page.

## Usage
1. Inject the script.
2. Switch to another tab or browser window and come back.
3. Check the console for logs starting with `[Re enter focus page]`.
