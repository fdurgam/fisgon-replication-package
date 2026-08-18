# WTS Skill Usage Example

To test a page for Winding Tab Sequence issues:

1. **Open the target page** in a browser.
2. **Inject html2canvas** (required for screenshots):
   ```javascript
   var script = document.createElement('script');
   script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
   document.head.appendChild(script);
   ```
3. **Execute the WTS script**:
   Copy and paste the contents of `scripts/detect-wts.js` into the console.
4. **Interact**:
   Press `Tab` repeatedly to navigate through the interactive elements.
5. **Analyze**:
   If a red arrow appears pointing upwards, it indicates a focus jump that disorients users relying on screen readers.
   
### Sample Report Output
```json
{
    "amenaza": "Winding Tab Sequence",
    "evento_id": 1,
    "fecha": "2026-03-27T18:50:00.000Z",
    "origen": "submit-button",
    "destino": "header-search",
    "salto_pixels": 450,
    "wcag": "2.4.3 — Orden del foco",
    "severidad": "🔴 CRÍTICO"
}
```
