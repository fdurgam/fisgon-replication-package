(function() {
    function AEvent(threatName) {
        var self = this;
        this.threatName = threatName;
        this.events = [];
        this.detect = false;
        this.isUnfocused = false;
        this.reEntryCount = 0;
        this.lastFocusedElement = null;
        this.lastUrl = window.location.href;
        this.lastInteraction = 'keyboard';

        document.addEventListener('mousedown', function() { self.lastInteraction = 'mouse'; }, true);
        document.addEventListener('keydown', function() { self.lastInteraction = 'keyboard'; }, true);

        function getElementMetadata(el) {
            if (!el || el === document.body || el.tagName === 'HTML') return null;
            var rect = el.getBoundingClientRect();
            var labels = Array.from(el.labels || []).map(l => l.innerText).join(', ');
            return {
                tag: el.tagName,
                id: el.id || '',
                name: el.getAttribute('name') || '',
                label: (labels || el.getAttribute('aria-label') || el.innerText || el.id || 'Desconocido').substring(0, 80).trim(),
                rect: { top: rect.top + window.scrollY, left: rect.left + window.scrollX, width: rect.width, height: rect.height }
            };
        }

        document.addEventListener('focusout', function(e) {
            // if (window.isFisgonSimulating) return;
            if (e.target && e.target !== document.body) {
                self.lastFocusedElement = getElementMetadata(e.target);
            }
        }, true);

        window.addEventListener('blur', function() {
            // if (window.isFisgonSimulating) return;
            self.isUnfocused = true;
            self.lastUrl = window.location.href;
        });

        window.addEventListener('focus', function() {
            // if (window.isFisgonSimulating) return;
            if (self.isUnfocused) {
                if (self.lastInteraction === 'mouse') {
                    self.isUnfocused = false;
                    return;
                }

                self.reEntryCount++;
                setTimeout(function() {
                    var el = document.activeElement;
                    var receivingElement = getElementMetadata(el);

                    // CANAL DE COMUNICACIÓN GLOBAL: Despachamos para los Smells
                    var event = new CustomEvent('AEvent:ReEnterFocusPageGlobal', {
                        detail: {
                            beforeElement: self.lastFocusedElement,
                            afterElement: receivingElement,
                            targetElement: el,
                            lastUrl: self.lastUrl,
                            currentUrl: window.location.href,
                            threatName: self.threatName,
                            engine: self
                        }
                    });
                    window.dispatchEvent(event);
                    
                    var aSwell = null;
                    var suggestions = null;

                    if (!receivingElement || el === document.body) {
                        aSwell = "Top-of-Page-Reset";
                        suggestions = "Asegúrate de restaurar el foco al elemento que lo tenía antes de que el usuario cambiara de pestaña.";
                    } else if (self.lastUrl !== window.location.href) {
                        aSwell = "State-Refresh-Disorientation";
                        suggestions = "Si el contenido cambia tras recuperar el foco, anuncia los cambios con un elemento aria-live.";
                    } else if (self.lastFocusedElement && receivingElement && self.lastFocusedElement.id !== receivingElement.id) {
                        aSwell = "Interruption-Banner-Hijack";
                        suggestions = "Evita que elementos nuevos (como banners de cookies o chats) 'roben' el foco al regresar a la pestaña.";
                    }

                    var entry = {
                        timestamp: Date.now(),
                        count: self.reEntryCount,
                        url: window.location.href,
                        msg: "El usuario regresó a la pestaña y recuperó el foco.",
                        aSwell: aSwell,
                        suggestions: suggestions,
                        beforeElement: self.lastFocusedElement,
                        afterElement: receivingElement
                    };

                    self.events.push(entry);
                    if (window.reportA11yIssue) window.reportA11yIssue({ type: self.threatName, ...entry });
                }, 150);

                self.isUnfocused = false;
            }
        });
    }

    if (!window.AE) window.AE = {};
    window.AE["Re enter focus page"] = new AEvent("Re enter focus page");
})();
