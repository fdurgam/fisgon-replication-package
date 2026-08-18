(function () {
    function AEvent(threatName) {
        var self = this;
        this.threatName = threatName;
        this.events = [];
        this.reportedSelects = new Map(); // selectElement -> lastOptionsString

        function isPlaceholder(option) {
            var val = (option.value || '').trim();
            var text = (option.textContent || '').trim().toLowerCase();
            return val === '' || 
                   text === '' || 
                   text.startsWith('seleccione') || 
                   text.startsWith('elija') || 
                   text.startsWith('select') || 
                   text.startsWith('choose') || 
                   text.startsWith('--') ||
                   text.includes('placeholder');
        }

        function checkSelect(select) {
            if (!select || select.closest('[data-fisgon-ignore="true"]')) return;

            var options = Array.from(select.options);
            var realOptions = options.filter(function (opt) {
                return !isPlaceholder(opt);
            });

            var optionsString = realOptions.map(function (opt) {
                return (opt.value || '') + ':' + (opt.textContent || '').trim();
            }).join('|');

            // Si las opciones no han cambiado, no volvemos a reportar el mismo elemento
            var lastSeen = self.reportedSelects.get(select);
            if (lastSeen === optionsString) return;

            self.reportedSelects.set(select, optionsString);

            // Si tiene menos de 3 opciones (y mayor que 0, para ignorar selects cargando o deshabilitados sin datos)
            if (realOptions.length > 0 && realOptions.length < 3) {
                console.log(
                    "%c [Short List Select] 🔔 EVENTO DETECTADO ➔ Dropdown con menos de 3 opciones (" + realOptions.length + ").",
                    "color: #ffffff; background: #ff9800; font-weight: bold; padding: 5px 10px; border-radius: 4px;"
                );

                // Despachamos canal de comunicación global para Smells
                var event = new CustomEvent('AEvent:ShortListSelectGlobal', {
                    detail: {
                        targetElement: select,
                        optionsCount: realOptions.length,
                        options: realOptions.map(o => o.textContent.trim()),
                        threatName: self.threatName,
                        engine: self
                    }
                });
                window.dispatchEvent(event);

                reportIssue(select, realOptions, "Short-List-Select", "El combo de selección contiene solo " + realOptions.length + " opciones reales.");
            }
        }

        // 1. Escuchar eventos de interacción del usuario
        document.addEventListener('focusin', function (e) {
            if (e.target && e.target.tagName === 'SELECT') {
                checkSelect(e.target);
            }
        }, true);

        document.addEventListener('click', function (e) {
            if (e.target && e.target.tagName === 'SELECT') {
                checkSelect(e.target);
            }
        }, true);

        document.addEventListener('change', function (e) {
            if (e.target && e.target.tagName === 'SELECT') {
                checkSelect(e.target);
            }
        }, true);

        // 2. Observador de Mutaciones para detectar carga dinámica de opciones
        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.type === 'childList') {
                    // Si se añaden opciones directamente
                    mutation.addedNodes.forEach(function (node) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.tagName === 'OPTION') {
                                var select = node.closest('select');
                                if (select) checkSelect(select);
                            } else if (node.tagName === 'SELECT') {
                                checkSelect(node);
                            } else {
                                // Buscar selects agregados en el subárbol
                                var nestedSelects = node.querySelectorAll('select');
                                nestedSelects.forEach(checkSelect);
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

        // Escaneo inicial de elementos existentes en la página
        setTimeout(function() {
            var selects = document.querySelectorAll('select');
            selects.forEach(checkSelect);
        }, 100);

        function reportIssue(select, realOptions, aSwell, msg) {
            var rect = select.getBoundingClientRect();
            var optionTexts = realOptions.map(function (opt) {
                return opt.textContent.trim();
            });

            var detail = {
                timestamp: Date.now(),
                skill_id: typeof skill_id !== 'undefined' ? skill_id : 'short-list-select',
                aSwell: aSwell,
                suggestions: "Si un elemento desplegable (select) tiene menos de 3 opciones reales, considera reemplazarlo por Radio Buttons, Checkboxes o un Switch para mejorar la visibilidad y reducir la carga cognitiva.",
                intent: "Selección de opciones",
                confidence_metrics: {
                    options_count: realOptions.length,
                    options: optionTexts
                },
                htmlBefore: "Opciones cargadas: " + realOptions.map(function(o) { return o.outerHTML; }).join(', '),
                htmlAfter: select.outerHTML,
                label: (select.labels && select.labels[0] ? select.labels[0].innerText : select.getAttribute('aria-label') || select.id || 'Dropdown sin etiqueta').substring(0, 80).trim(),
                rect: {
                    top: rect.top + window.scrollY,
                    left: rect.left + window.scrollX,
                    width: rect.width,
                    height: rect.height
                },
                msg: msg
            };
            self.events.push(detail);
            if (window.reportA11yIssue) window.reportA11yIssue({ type: self.threatName, ...detail });
        }
    }

    if (!window.AE) window.AE = {};
    window.AE["Short List Select"] = new AEvent("Short List Select");
})();
