# Using Short List Select

### How to Test

Execute this snippet in the browser console to dynamically inject select dropdowns with fewer than 3 options:

```javascript
// 1. Create a container with dynamic selects
const testContainer = document.createElement('div');
testContainer.style.padding = '20px';
testContainer.style.background = '#f9f9f9';
testContainer.innerHTML = `
  <h3>Caso 1: Select estático con pocas opciones (Sí/No)</h3>
  <label for="newsletter">¿Desea recibir notificaciones?</label>
  <select id="newsletter">
    <option value="">Seleccione una opción...</option>
    <option value="yes">Sí</option>
    <option value="no">No</option>
  </select>

  <h3>Caso 2: Carga dinámica basada en interacción</h3>
  <label for="country">País:</label>
  <select id="country">
    <option value="">Seleccione...</option>
    <option value="ar">Argentina</option>
    <option value="uy">Uruguay</option>
  </select>

  <label for="region">Región:</label>
  <select id="region" disabled>
    <option value="">Seleccione país primero...</option>
  </select>
`;
document.body.appendChild(testContainer);

// 2. Simular carga dinámica con menos de 3 opciones
const countrySelect = document.getElementById('country');
const regionSelect = document.getElementById('region');

countrySelect.addEventListener('change', () => {
  if (countrySelect.value === 'uy') {
    regionSelect.disabled = false;
    regionSelect.innerHTML = `
      <option value="">Seleccione departamento...</option>
      <option value="mo">Montevideo</option>
    `; // Solo 1 opción real
  } else if (countrySelect.value === 'ar') {
    regionSelect.disabled = false;
    regionSelect.innerHTML = `
      <option value="">Seleccione provincia...</option>
      <option value="ba">Buenos Aires</option>
      <option value="er">Entre Ríos</option>
    `; // Solo 2 opciones reales
  }
});
```

When you focus or interact with these select elements (or select a country, causing a dynamic load in the region dropdown), the engine will output the warning in the console:
`[Short List Select] 🔔 EVENTO DETECTADO ➔ Dropdown con menos de 3 opciones`
and report the issue via `window.reportA11yIssue`.
