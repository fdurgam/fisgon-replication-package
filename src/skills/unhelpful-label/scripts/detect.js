(function () {
    function AEvent(threatName) {
        var self = this;
        this.threatName = threatName;
        this.events = [];

        function checkInput(el) {
            if (!el || el.closest('[data-fisgon-ignore="true"]')) return;

            var tag = el.tagName;
            if (tag === 'INPUT') {
                var type = (el.type || 'text').toLowerCase();
                if (['submit', 'button', 'image', 'hidden', 'file', 'radio', 'checkbox'].includes(type)) return;
            }

            // Despachamos al analizador de Smells
            var event = new CustomEvent('AEvent:UnhelpfulLabelGlobal', {
                detail: { targetElement: el, threatName: self.threatName, engine: self }
            });
            window.dispatchEvent(event);
        }

        // 1. Escuchar foco, clics e interacciones
        document.addEventListener('focusin', function (e) {
            var tag = e.target.tagName;
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
                checkInput(e.target);
            }
        }, true);

        document.addEventListener('click', function (e) {
            var tag = e.target.tagName;
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
                checkInput(e.target);
            }
        }, true);

        // 2. Mutation Observer para elementos agregados dinámicamente
        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function (node) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            var tag = node.tagName;
                            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
                                checkInput(node);
                            } else {
                                var inputs = node.querySelectorAll('input, textarea, select');
                                inputs.forEach(checkInput);
                            }
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
            var inputs = document.querySelectorAll('input, textarea, select');
            inputs.forEach(checkInput);
        }, 300);

        console.log("%c 🚀 [AEvent Unhelpful Label] Escuchando inputs y formas... ", "color: #e91e63; font-weight: bold;");
    }

    if (!window.AE) window.AE = {};
    window.AE["Unhelpful Label"] = new AEvent("Unhelpful Label");
})();
