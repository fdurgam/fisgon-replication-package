(function() {
    function AEvent(threatName) {
        var self = this;
        this.threatName = threatName;
        this.events = [];
        this.lastFocus = null;
        this.lastActionTime = Date.now();

        // Escuchar interacciones para determinar "intención"
        document.addEventListener('keydown', function() { self.lastActionTime = Date.now(); }, true);
        document.addEventListener('mousedown', function() { self.lastActionTime = Date.now(); }, true);

        document.addEventListener('focusout', function(e) {
            self.lastFocus = { 
                el: e.target, 
                time: Date.now(),
                tagName: e.target.tagName,
                role: e.target.getAttribute('role'),
                label: e.target.innerText || e.target.ariaLabel || e.target.placeholder
            };
        }, true);

        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                mutation.removedNodes.forEach(function(node) {
                    if (node.nodeType !== 1) return;
                    if (node.getAttribute && node.getAttribute('data-fisgon-ignore') === 'true') return;
                    if (node.closest && node.closest('[data-fisgon-ignore="true"]')) return;
                    if (node.id && node.id.indexOf('fisgon') !== -1) return;
                    if (node.querySelector && node.querySelector('[data-fisgon-ignore="true"]')) return;

                    // CANAL DE COMUNICACIÓN GLOBAL: Despachamos para los Smells
                    var event = new CustomEvent('AEvent:ContentRemovedGlobal', {
                        detail: {
                            removedNode: node,
                            lastFocus: self.lastFocus,
                            lastActionTime: self.lastActionTime,
                            threatName: self.threatName,
                            engine: self
                        }
                    });
                    window.dispatchEvent(event);

                    var aSwell = null;
                    var suggestions = null;
                    var confidence_metrics = {
                        proximity_to_action: Date.now() - self.lastActionTime,
                        was_focused: false
                    };

                    // 1. Stale-Context-Reading
                    if (self.lastFocus && (node === self.lastFocus.el || node.contains(self.lastFocus.el)) && (Date.now() - self.lastFocus.time < 150)) {
                        aSwell = "Stale-Context-Reading";
                        suggestions = "Si eliminas el elemento que tiene el foco, muévelo manualmente a un contenedor lógico o al siguiente elemento válido.";
                        confidence_metrics.was_focused = true;
                    }

                    // 2. Ephemeral-Alert-Loss
                    var isAlert = node.getAttribute('role') === 'alert' || node.classList.contains('alert');
                    if (isAlert) {
                        aSwell = "Ephemeral-Alert-Loss";
                        suggestions = "Los mensajes de estado deben permanecer visibles el tiempo suficiente para ser leídos. No los elimines automáticamente tan rápido.";
                    }

                    // 3. Silent-Mutation-Failure
                    if (!aSwell && node.innerText && node.innerText.length > 20) {
                        var hasLiveRegionNear = !!document.querySelector('[aria-live="polite"], [aria-live="assertive"]');
                        if (!hasLiveRegionNear) {
                            aSwell = "Silent-Mutation-Failure";
                            suggestions = "Si el contenido desaparece tras una acción del usuario, asegúrate de notificarlo mediante un elemento con aria-live.";
                        }
                    }

                    if (aSwell) {
                        var detail = {
                            timestamp: Date.now(),
                            skill_id: typeof skill_id !== 'undefined' ? skill_id : 'content-removed-without-notice',
                            aSwell: aSwell,
                            suggestions: suggestions,
                            intent: confidence_metrics.proximity_to_action < 1000 ? "Interacción del usuario" : "Proceso asíncrono/Timer",
                            confidence_metrics: confidence_metrics,
                            htmlBefore: node.outerHTML,
                            tag: node.tagName,
                            id: node.id || 'none',
                            msg: "Contenido eliminado sin notificación adecuada."
                        };
                        self.events.push(detail);
                        if (window.reportA11yIssue) window.reportA11yIssue({ type: self.threatName, ...detail });
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (!window.AE) window.AE = {};
    window.AE["Content Removed Without Notice"] = new AEvent("Content Removed Without Notice");
})();
