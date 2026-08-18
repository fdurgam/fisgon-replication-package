(function () {
    function AEvent(threatName) {
        var self = this;
        this.threatName = threatName;
        this.events = [];

        function checkElement(el) {
            if (!el || el.closest('[data-fisgon-ignore="true"]')) return;

            var tag = el.tagName;
            var isCandidate = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(tag) ||
                               el.getAttribute('role') ||
                               el.getAttribute('aria-label') ||
                               el.querySelector('.sr-only, .visually-hidden, [class*="sr-only"], [class*="visually-hidden"]') ||
                               ['active', 'disabled', 'selected', 'expanded', 'collapsed'].some(c => el.className && typeof el.className === 'string' && el.className.toLowerCase().includes(c));

            if (isCandidate) {
                // Despachamos al analizador de Smells
                var event = new CustomEvent('AEvent:MisleadingSpeechGlobal', {
                    detail: { targetElement: el, threatName: self.threatName, engine: self }
                });
                window.dispatchEvent(event);
            }
        }

        // 1. Escuchar interacciones del usuario
        document.addEventListener('focusin', function (e) {
            checkElement(e.target);
        }, true);

        document.addEventListener('click', function (e) {
            checkElement(e.target);
        }, true);

        // 2. Mutation Observer para cambios en clases/atributos y elementos dinámicos
        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function (node) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            checkElement(node);
                            var descendants = node.querySelectorAll('button, a, input, select, textarea, [role], [aria-label], .sr-only, .visually-hidden');
                            descendants.forEach(checkElement);
                        }
                    });
                } else if (mutation.type === 'attributes') {
                    checkElement(mutation.target);
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'aria-selected', 'aria-expanded', 'aria-disabled', 'aria-checked', 'disabled']
        });

        // Escaneo inicial
        setTimeout(function () {
            var els = document.querySelectorAll('button, a, input, select, textarea, [role], [aria-label], .sr-only, .visually-hidden');
            els.forEach(checkElement);
        }, 300);

        console.log("%c 🚀 [AEvent Misleading Speech Synthesis] Registrado y analizando consistencia semántica... ", "color: #e91e63; font-weight: bold;");
    }

    if (!window.AE) window.AE = {};
    window.AE["Misleading Speech Synthesis"] = new AEvent("Misleading Speech Synthesis");
})();
