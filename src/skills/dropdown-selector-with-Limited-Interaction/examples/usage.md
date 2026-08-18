# Using Dropdown Selector with Limited Interaction

### How to Test

Execute this snippet in the browser console to dynamically inject a custom select component with broken ARIA states:

```javascript
// 1. Create a container with custom select components
const testContainer = document.createElement('div');
testContainer.style.padding = '20px';
testContainer.style.background = '#f9f9f9';
testContainer.innerHTML = `
  <h3>Caso 1: Custom Select con desajuste de clase activa (Sin aria-selected)</h3>
  <div class="custom-select" role="combobox" aria-expanded="true">
    <div class="custom-option" id="opt-1">Opción A (Inactiva)</div>
    <div class="custom-option select-active" id="opt-2">Opción B (Activa visualmente)</div>
    <div class="custom-option" id="opt-3">Opción C (Inactiva)</div>
  </div>

  <h3>Caso 2: Custom Select con activedescendant roto</h3>
  <div class="custom-select-b" role="combobox" aria-expanded="true" aria-activedescendant="non-existent-id">
    <div class="custom-option" id="opt-b-1">Opción X</div>
    <div class="custom-option" id="opt-b-2">Opción Y</div>
  </div>
`;
document.body.appendChild(testContainer);

// 2. Simular un cambio visual por interacción de usuario
const opt1 = document.getElementById('opt-1');
const opt2 = document.getElementById('opt-2');

opt1.addEventListener('click', () => {
  // Cambiamos clases visuales pero NO actualizamos aria-selected ni aria-activedescendant
  opt2.classList.remove('select-active');
  opt1.classList.add('select-active');
});
```

When you click on the options, or interact with them, or upon initial injection, the engine will scan and detect:
1. That `opt-2` (and later `opt-1` on click) has the class `select-active` but lacks `aria-selected="true"`.
2. That the parent `custom-select-b` combobox's `aria-activedescendant` points to a non-existent ID `non-existent-id`.

Check the console for logs starting with `[Limited Interaction Dropdown]` and check the reported issues.
