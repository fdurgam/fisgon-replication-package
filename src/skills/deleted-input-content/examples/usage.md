# Using Deleted Input Content

### How to Test
Execute this snippet in the console to simulate a failure:

```javascript
// 1. Create a "fragile" input
const input = document.createElement('input');
input.placeholder = "Try to type something...";
input.onblur = () => input.value = ""; // Clears on blur
document.body.appendChild(input);

// 2. Type "Hello"
// 3. Tab out
// You should see the [Deleted Input Content] warning.
```
