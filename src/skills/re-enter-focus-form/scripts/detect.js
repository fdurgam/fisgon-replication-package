(function() {
    function AEvent(threatName) {
        var self = this;
        this.threatName = threatName;
        this.events = [];
        this.detect = false;
        this.unfocusedForms = {};
        this.reEntryCounts = {};
        this.lastFocusedByForm = {};
        this.lastInteraction = 'keyboard'; // default

        document.addEventListener('mousedown', function() { self.lastInteraction = 'mouse'; }, true);
        document.addEventListener('keydown', function() { self.lastInteraction = 'keyboard'; }, true);

        function getElementMetadata(el) {
            var rect = el.getBoundingClientRect();
            var labels = Array.from(el.labels || []).map(l => l.innerText).join(', ');
            return {
                tag: el.tagName,
                id: el.id || '',
                name: el.getAttribute('name') || '',
                placeholder: el.getAttribute('placeholder') || '',
                ariaLabel: el.getAttribute('aria-label') || '',
                html: el.outerHTML,
                label: (labels || el.getAttribute('aria-label') || el.innerText || el.id || 'Desconocido').substring(0, 80).trim(),
                rect: { top: rect.top + window.scrollY, left: rect.left + window.scrollX, width: rect.width, height: rect.height }
            };
        }

        document.addEventListener('focusout', function(e) {
            // if (window.isFisgonSimulating) return;
            var el = e.target;
            if (!el || el === document.body || (el.closest && el.closest('[data-fisgon-ignore="true"]'))) return;
            var form = el.closest('form');
            if (form) {
                var newFocus = e.relatedTarget;
                var formId = form.id || form.tagName;
                self.lastFocusedByForm[formId] = getElementMetadata(el);
                // Store error state at focusout to check for "lag" later
                self.lastFocusedByForm[formId].hasError = !!document.querySelector('[role="alert"], .error-message, .invalid-feedback');
                
                if (!newFocus || !form.contains(newFocus)) {
                    self.unfocusedForms[formId] = true;
                }
            }
        }, true);

        document.addEventListener('focusin', function(e) {
            // if (window.isFisgonSimulating) return;
            if (e.target.closest && e.target.closest('[data-fisgon-ignore="true"]')) return;
            var form = e.target.closest('form');
            if (form) {
                var formId = form.id || form.tagName;
                if (self.unfocusedForms[formId]) {
                    if (self.lastInteraction === 'mouse') {
                        delete self.unfocusedForms[formId];
                        return; // Ignore mouse-driven re-entry
                    }

                    self.reEntryCounts[formId] = (self.reEntryCounts[formId] || 0) + 1;
                    var before = self.lastFocusedByForm[formId] || null;
                    var after = getElementMetadata(e.target);

                    // CANAL DE COMUNICACIÓN GLOBAL: Despachamos para los Smells
                    var event = new CustomEvent('AEvent:ReEnterFocusFormGlobal', {
                        detail: {
                            form: form,
                            formId: formId,
                            before: before,
                            after: after,
                            targetElement: e.target,
                            threatName: self.threatName,
                            engine: self
                        }
                    });
                    window.dispatchEvent(event);
                    
                    // --- ASmell Diagnostic ---
                    var aSwell = null;
                    var suggestions = null;

                    if (before && before.id && after.id && before.id !== after.id && before.name === after.name) {
                        aSwell = "Label-Disassociation";
                        suggestions = "Evita generar IDs dinámicos para los inputs en cada renderizado. Esto rompe la asociación con <label for='...'>.";
                    } else if (after.placeholder && !after.ariaLabel && !e.target.labels?.length) {
                        aSwell = "Placeholder-Deception";
                        suggestions = "No uses el 'placeholder' como única referencia. Usa etiquetas <label> explícitas o 'aria-label'.";
                    } else if (before && !before.hasError && document.querySelector('[role="alert"], .error-message, .invalid-feedback')) {
                        aSwell = "Status-Update-Lag";
                        suggestions = "Asegúrate de que los mensajes de error tengan role='alert' o aria-live='assertive' para que se anuncien sin necesidad de re-enfocar.";
                    }

                    var entry = {
                        timestamp: Date.now(),
                        formId: formId,
                        reEntryCount: self.reEntryCounts[formId],
                        msg: "El usuario regresó al formulario tras perder el foco del contexto.",
                        aSwell: aSwell,
                        suggestions: suggestions,
                        htmlBefore: (before && before.html) ? before.html : null,
                        htmlAfter: (after && after.html) ? after.html : null,
                        beforeElement: before,
                        afterElement: after
                    };

                    self.events.push(entry);
                    if (window.reportA11yIssue) window.reportA11yIssue({ type: self.threatName, ...entry });
                    delete self.unfocusedForms[formId];
                }
            }
        }, true);
    }

    if (!window.AE) window.AE = {};
    window.AE["Re enter focus form"] = new AEvent("Re enter focus form");
})();
