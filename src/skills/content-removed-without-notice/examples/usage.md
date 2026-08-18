# Using Content Removed Without Notice

### How to Test
Execute this snippet in the console to simulate a failure:

```javascript
// 1. Create a button that removes itself when clicked
const btn = document.createElement('button');
btn.innerText = "Click to vanish";
btn.onclick = () => btn.remove();
document.body.appendChild(btn);

// 2. Focus the button (simulating keyboard nav)
btn.focus();

// 3. Click it (or press Enter)
// You should see the [Content Removed Without Notice] warning in the console.
```
