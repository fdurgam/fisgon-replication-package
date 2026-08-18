(function () {
    function AEvent(threatName) {
        var self = this;
        this.threatName = threatName;
        this.events = [];

        // Función interna que valida si el elemento califica como modal interactivo
        function evaluarSiEsModal(node) {
            if (!node || node.nodeType !== 1) return;
            if (node.closest && node.closest('[data-fisgon-ignore="true"]')) return;

            var style = window.getComputedStyle(node);

            // Heurística flexibilizada: Flotante, con z-index alto, y que sea visible en pantalla
            var esFlotante = style.position === 'fixed' || style.position === 'absolute';
            var tieneZIndex = parseInt(style.zIndex, 10) > 50;
            var esVisible = style.display !== 'none' && style.visibility !== 'hidden' && node.offsetWidth > 0;

            if (esFlotante && tieneZIndex && esVisible) {
                // Evitamos reportar el mismo modal repetidas veces en el mismo segundo
                if (node.dataset.alreadyAudited === "true") return;
                node.dataset.alreadyAudited = "true";
                setTimeout(function () { node.dataset.alreadyAudited = "false"; }, 1000);

                // 📢 EL AVISO QUE QUERÉS VER EN CONSOLA
                console.log(
                    "%c 🔔 [AEvent Mapped] ➔ Event: " + self.threatName + " \n[Evidencia] ¡Capturado! Un elemento flotante interactivo se ha vuelto visible en pantalla.",
                    "color: #ffffff; background: #2196f3; font-weight: bold; padding: 6px 12px; border-radius: 4px; line-height: 1.5;"
                );

                // Despachamos al analizador de Smells (Parte 2)
                var event = new CustomEvent('AEvent:ModalDetectedGlobal', {
                    detail: { node: node, threatName: self.threatName, engine: self }
                });
                window.dispatchEvent(event);
            }
        }

        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                // Caso A: El modal fue inyectado directamente en el DOM
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function (node) {
                        evaluarSiEsModal(node);
                        // Revisamos hijos inmediatos por si el modal vino envuelto en otro div
                        if (node.querySelectorAll) {
                            node.querySelectorAll('[style*="position"], div').forEach(evaluarSiEsModal);
                        }
                    });
                }
                // Caso B: El modal ya existía pero pasó de oculto a visible (clases o estilos cambiados)
                if (mutation.type === 'attributes' && (mutation.attributeName === 'class' || mutation.attributeName === 'style')) {
                    evaluarSiEsModal(mutation.target);
                }
            });
        });

        // Escuchamos inserciones Y cambios de atributos en toda la página
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style']
        });

        console.log("%c 🚀 [AEvent Universal] Escuchando inserciones y cambios de visibilidad en la página... ", "color: #2196f3; font-weight: bold;");
    }

    if (!window.AE) window.AE = {};
    window.AE["Modal Window Display"] = new AEvent("Modal Window Display");
})();
