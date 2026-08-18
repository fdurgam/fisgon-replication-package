# Using Re-enter Focus Form

### How to Test
1. Create a form and an external button:
```javascript
const form = document.createElement('form');
form.innerHTML = '<input type="text" id="f1">';
document.body.appendChild(form);

const btn = document.createElement('button');
btn.innerText = "External Info";
document.body.appendChild(btn);
```
2. Focus the input, then focus the "External Info" button.
3. Return to the input.
4. You should see "Re-entry #1" in the console.
