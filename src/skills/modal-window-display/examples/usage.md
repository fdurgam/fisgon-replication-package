# Using Modal Window Display

### How to Test
Execute this snippet in the console to simulate a non-semantic modal:

```javascript
// 1. Create a "fake" modal (just a styled div)
const modal = document.createElement('div');
modal.id = "bad-modal";
modal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    width: 300px;
    height: 200px;
    background: white;
    z-index: 1000;
    transform: translate(-50%, -50%);
    box-shadow: 0 0 10px rgba(0,0,0,0.5);
    display: block;
`;
modal.innerHTML = "<h2>I am a modal</h2><p>But I have no role.</p>";

// 2. Append to body - this triggers the observer
document.body.appendChild(modal);

// You should see the [Modal Window Display] warning in the console.
```
