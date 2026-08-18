(function () {
    function AEvent(threatName) {
        var self = this;
        this.threatName = threatName;
        this.events = [];

        function checkElement(el) {
            if (!el || el.closest('[data-fisgon-ignore="true"]')) return;

            var tag = el.tagName;
            var isImgOrSvg = tag === 'IMG' || tag === 'SVG';
            var isInteractive = tag === 'BUTTON' || 
                                 (tag === 'A' && el.hasAttribute('href')) || 
                                 el.getAttribute('role') === 'button' || 
                                 el.hasAttribute('onclick') || 
                                 el.getAttribute('tabindex') === '0';

            if (isImgOrSvg || isInteractive) {
                // Despachamos al analizador de Smells
                var event = new CustomEvent('AEvent:MissingSRTextGlobal', {
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

        // 2. Mutation Observer para elementos dinámicos
        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function (node) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            checkElement(node);
                            var descendants = node.querySelectorAll('img, svg, button, a, [role="button"], [tabindex="0"]');
                            descendants.forEach(checkElement);
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Escaneo inicial
        setTimeout(function () {
            var els = document.querySelectorAll('img, svg, button, a, [role="button"], [tabindex="0"]');
            els.forEach(checkElement);
        }, 300);

        console.log("%c 🚀 [AEvent Missing SR Text] Registrado e hilvanando elementos multimedia... ", "color: #e91e63; font-weight: bold;");
    }

    if (!window.AE) window.AE = {};
    window.AE["Missing SR Text"] = new AEvent("Missing SR Text");
})();
