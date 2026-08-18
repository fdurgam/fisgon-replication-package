# Using Frequent Tab

### How to Test

Execute this snippet in the browser console to dynamically inject HTML elements that recreate keyboard navigation loops (focus traps) or excessive tab queues:

```javascript
// 1. Create a container with focus traps and high tab counts
const testContainer = document.createElement('div');
testContainer.style.padding = '20px';
testContainer.style.background = '#f9f9f9';
testContainer.innerHTML = `
  <h3>Caso 1: Bucle cerrado de foco (Keyboard Focus Trap)</h3>
  <div id="trap-container" style="border: 1px solid #ccc; padding: 10px;">
    <button id="trap-btn-1">Opción A</button>
    <button id="trap-btn-2">Opción B</button>
    <button id="trap-btn-3">Opción C</button>
  </div>

  <h3>Caso 2: Cola de enlaces y elementos repetitivos sin bypass blocks</h3>
  <div id="long-menu" style="display:flex; flex-direction:column; gap:5px; max-height:150px; overflow-y:scroll;">
    ${Array.from({length: 25}, (_, i) => `<a href="#link-${i}" id="menu-item-${i}">Enlace de menú ${i + 1}</a>`).join('\n')}
  </div>
`;
document.body.appendChild(testContainer);

// 2. Crear el bucle lógico de foco en el Caso 1
const trapBtn1 = document.getElementById('trap-btn-1');
const trapBtn3 = document.getElementById('trap-btn-3');

trapBtn3.addEventListener('keydown', (e) => {
  if (e.key === 'Tab' && !e.shiftKey) {
    e.preventDefault();
    trapBtn1.focus(); // Retorna el foco al inicio del bucle
  }
});

trapBtn1.addEventListener('keydown', (e) => {
  if (e.key === 'Tab' && e.shiftKey) {
    e.preventDefault();
    trapBtn3.focus(); // Retorna el foco al final del bucle (hacia atrás)
  }
});
```

When you interact with these elements via the keyboard:
1. **Focus Trap**: Navigate between Opción A, B, and C in the first container using the `Tab` key. Once you hit option C, it loops back to A. After two loops (e.g. `trap-btn-1 -> trap-btn-2 -> trap-btn-3 -> trap-btn-1 -> trap-btn-2 -> trap-btn-3`), the engine will detect the `Keyboard-Focus-Trap` smell.
2. **Navigation Fatigue**: Tab continuously through the 25 menu links. Once the sequential Tab presses exceed 15 times, the engine will detect the `Navigation-Fatigue` smell.

Check the console for logs starting with `[Frequent Tab]` and check the reported issues.
