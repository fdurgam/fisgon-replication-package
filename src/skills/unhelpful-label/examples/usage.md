# Using Unhelpful Label

### How to Test

Execute this snippet in the browser console to dynamically inject form elements with broken, missing, or unhelpful label associations:

```javascript
// 1. Create a container with bad labeling patterns
const testContainer = document.createElement('div');
testContainer.style.padding = '20px';
testContainer.style.background = '#f9f9f9';
testContainer.innerHTML = `
  <h3>Caso 1: Input completamente sin etiqueta ni nombre accesible</h3>
  <div>
    <input type="text" id="username-field">
  </div>

  <h3>Caso 2: Input con placeholder usado como única etiqueta</h3>
  <div>
    <input type="email" id="email-field" placeholder="Ingresa tu correo aquí">
  </div>

  <h3>Caso 3: Etiqueta genérica (span/div) sin vinculación semántica</h3>
  <div>
    <span class="visual-label">Contraseña:</span>
    <input type="password" id="password-field">
  </div>

  <h3>Caso 4: Asociación rota (ID incorrecto en atributo 'for')</h3>
  <div>
    <label for="incorrect-id">Nombre Completo:</label>
    <input type="text" id="fullname-field">
  </div>
`;
document.body.appendChild(testContainer);
```

When you focus or click on any of these inputs, the engine will run the telemetry and report issues like:
1. `Missing-Input-Label` (Caso 1)
2. `Placeholder-As-Label` (Caso 2)
3. `Generic-Element-Label` (Caso 3)
4. `Broken-Label-Association` (Caso 4)

Check the console for logs starting with `[Unhelpful Label]` and check the reported issues.
