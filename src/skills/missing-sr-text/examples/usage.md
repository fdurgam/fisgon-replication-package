# Using Missing SR Text

### How to Test

Execute this snippet in the browser console to dynamically inject elements that lack descriptive textual alternatives:

```javascript
// 1. Create a container with bad textual alternative patterns
const testContainer = document.createElement('div');
testContainer.style.padding = '20px';
testContainer.style.background = '#f9f9f9';
testContainer.innerHTML = `
  <h3>Caso 1: Imagen sin atributo alt</h3>
  <div>
    <img src="https://images.unsplash.com/photo-1579546929518-9e396f3cc809" width="100" id="unlabelled-image">
  </div>

  <h3>Caso 2: Botón con ícono y sin texto ni aria-label</h3>
  <div>
    <button id="icon-button" style="padding:10px;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M19 7l-.8 11.2c-.1 1-.9 1.8-2 1.8H7.8c-1 0-1.8-.8-2-1.8L5 7m5 4v6m4-6v6M1 7h22m-16 0V4c0-1 1-2 2-2h6c1 0 2 1 2 2v3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  </div>

  <h3>Caso 3: Elemento interactivo con aria-hidden="true" (Foco teclado pero mudo)</h3>
  <div>
    <a href="#link" id="muted-link" aria-hidden="true" style="display:inline-block; padding:10px;">Ir a Sección</a>
  </div>
`;
document.body.appendChild(testContainer);
```

When you focus or click on any of these elements, the engine will run the telemetry and report issues like:
1. `Unlabelled-Image` (Caso 1)
2. `Mute-Interactive-Control` (Caso 2)
3. `Muted-Interactive-Element` (Caso 3)

Check the console for logs starting with `[Missing SR Text]` and check the reported issues.
