# Misleading Speech Synthesis Usage

Here are some test layouts to trigger this skill:

```html
<!-- 1. Stale-SR-Only-Text -->
<button>
  Enviar Mensaje
  <span class="sr-only">Cerrar Sesión</span>
</button>

<!-- 2. Visual-Semantic-Mismatch -->
<button aria-label="Cancelar">Aceptar</button>

<!-- 3. Stale-Accessibility-State -->
<button class="active tab" aria-selected="false">Pestaña 1</button>
<button class="disabled" aria-disabled="false">Enviar</button>
<button class="collapsed" aria-expanded="true">Mostrar más</button>
```

When you tab into or click these elements, the console will output:
`[🚨 ASMELL ➔ <SmellType>]`
And the issues will be reported via `window.reportA11yIssue`.
