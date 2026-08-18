# Using Skipped Focus Element

### How to Test
Execute this snippet in the console to simulate a broken tab order:

```javascript
// 1. Create a form with an out-of-order tabindex
const form = document.createElement('form');
form.innerHTML = `
  <div>1. <input type="text" id="field1" tabindex="1"></div>
  <div>2. <input type="text" id="field2" tabindex="3"> <!-- This will be skipped if tabbing from 1 to 2? No, tabindex 3 comes after 1. Wait. -->
  <div>3. <input type="text" id="field3" tabindex="2"></div>
`;
document.body.appendChild(form);

// If you tab from Field 1 (tabindex 1) it will go to Field 3 (tabindex 2).
// Field 2 (tabindex 3) is skipped in the visual sequence.
```
Actually, a better test is using `tabindex="-1"` on a visible element or using CSS `order` to move elements visually but not in the DOM.
