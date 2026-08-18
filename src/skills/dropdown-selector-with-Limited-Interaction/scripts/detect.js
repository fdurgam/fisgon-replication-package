(function () {
    function AEvent(threatName) {
        var self = this;
        this.threatName = threatName;
        this.events = [];
        this.reportedIssues = new Set();

        function getSelector(el) {
            if (!el) return 'N/A';
            if (el.id) return '#' + el.id;
            var path = el.tagName.toLowerCase();
            if (el.className) {
                var cleanClasses = Array.from(el.classList).filter(c => !c.startsWith('__fisgon'));
                if (cleanClasses.length > 0) {
                    path += '.' + cleanClasses.join('.');
                }
            }
            return path;
        }

        function getVisualSelectionClass(el) {
            if (!el || !el.classList) return null;
            var classes = Array.from(el.classList);
            for (var i = 0; i < classes.length; i++) {
                var c = classes[i].toLowerCase();
                if (c.includes('selected') || c.includes('active') || c.includes('highlighted') || c.includes('focused') || c.includes('hover')) {
                    return classes[i];
                }
            }
            return null;
        }

        function hasVisualSelectionClass(el) {
            return getVisualSelectionClass(el) !== null;
        }

        function checkDropdown(dropdown) {
            if (!dropdown || dropdown.closest('[data-fisgon-ignore="true"]')) return;

            // Encontrar opciones dentro del dropdown
            var options = Array.from(dropdown.querySelectorAll('[role="option"], [class*="option"], [class*="item"], [class*="choice"]'));
            if (options.length === 0) return;

            var dropdownSelector = getSelector(dropdown);

            // 1. Mismatch de selección: la opción tiene clase activa visual, pero no aria-selected="true"
            options.forEach(function (option) {
                var visualClass = getVisualSelectionClass(option);
                var ariaSelected = option.getAttribute('aria-selected');

                if (visualClass && ariaSelected !== 'true') {
                    var optionSelector = getSelector(option);
                    var key = dropdownSelector + '|' + optionSelector + '|selection-mismatch|' + visualClass;

                    if (!self.reportedIssues.has(key)) {
                        self.reportedIssues.add(key);

                        console.log(
                            "%c [Limited Interaction Dropdown] 🔔 EVENTO DETECTADO ➔ Desajuste de accesibilidad (clase '" + visualClass + "' activa pero aria-selected !== 'true') en: " + optionSelector,
                            "color: #ffffff; background: #9c27b0; font-weight: bold; padding: 5px 10px; border-radius: 4px;"
                        );

                        // Canal de comunicación global para Smells
                        var event = new CustomEvent('AEvent:LimitedInteractionDropdownGlobal', {
                            detail: {
                                type: 'selection-mismatch',
                                targetElement: option,
                                parentElement: dropdown,
                                visualClass: visualClass,
                                threatName: self.threatName,
                                engine: self
                            }
                        });
                        window.dispatchEvent(event);

                        reportIssue(dropdown, option, "ARIA-Selection-Mismatch",
                            "La opción del selector personalizado tiene la clase visual '" + visualClass + "' pero no tiene aria-selected='true'. El lector de pantalla no anunciará la selección.",
                            { visualClass: visualClass, ariaSelected: ariaSelected }
                        );
                    }
                }
            });

            // 2. Mismatch de aria-activedescendant
            var ariaActiveDescendant = dropdown.getAttribute('aria-activedescendant');
            if (ariaActiveDescendant) {
                var activeEl = document.getElementById(ariaActiveDescendant);
                if (!activeEl) {
                    var key = dropdownSelector + '|none|broken-activedescendant|' + ariaActiveDescendant;
                    if (!self.reportedIssues.has(key)) {
                        self.reportedIssues.add(key);

                        console.log(
                            "%c [Limited Interaction Dropdown] 🔔 EVENTO DETECTADO ➔ aria-activedescendant apunta a un ID inexistente: " + ariaActiveDescendant,
                            "color: #ffffff; background: #9c27b0; font-weight: bold; padding: 5px 10px; border-radius: 4px;"
                        );

                        reportIssue(dropdown, null, "ARIA-ActiveDescendant-Broken",
                            "El selector personalizado define aria-activedescendant='" + ariaActiveDescendant + "' pero ningún elemento en la página tiene ese ID.",
                            { activedescendantId: ariaActiveDescendant }
                        );
                    }
                } else {
                    // Si el elemento apuntado existe, verificar si es el que tiene la clase visualmente seleccionada.
                    var isVisuallySelected = hasVisualSelectionClass(activeEl);
                    if (!isVisuallySelected) {
                        // Buscar cuál es el que realmente tiene la clase de selección
                        var actualVisualActive = options.find(hasVisualSelectionClass);
                        if (actualVisualActive && actualVisualActive.id && actualVisualActive.id !== ariaActiveDescendant) {
                            var key = dropdownSelector + '|' + actualVisualActive.id + '|activedescendant-mismatch|' + ariaActiveDescendant;
                            if (!self.reportedIssues.has(key)) {
                                self.reportedIssues.add(key);

                                console.log(
                                    "%c [Limited Interaction Dropdown] 🔔 EVENTO DETECTADO ➔ Desajuste entre el elemento activo visual (ID: " + actualVisualActive.id + ") y el aria-activedescendant (ID: " + ariaActiveDescendant + ")",
                                    "color: #ffffff; background: #9c27b0; font-weight: bold; padding: 5px 10px; border-radius: 4px;"
                                );

                                reportIssue(dropdown, actualVisualActive, "ARIA-ActiveDescendant-Mismatch",
                                    "La opción activa visualmente (ID: " + actualVisualActive.id + ") no coincide con el aria-activedescendant apuntado (ID: " + ariaActiveDescendant + ").",
                                    { activedescendantId: ariaActiveDescendant, actualActiveId: actualVisualActive.id }
                                );
                            }
                        }
                    }
                }
            }
        }

        // 1. Escuchar interacciones y foco
        document.addEventListener('focusin', function (e) {
            var el = e.target;
            if (el) {
                var dropdown = el.closest('[role="combobox"], [role="listbox"], [class*="select"], [class*="dropdown"]');
                if (dropdown) checkDropdown(dropdown);
            }
        }, true);

        document.addEventListener('click', function (e) {
            var el = e.target;
            if (el) {
                var dropdown = el.closest('[role="combobox"], [role="listbox"], [class*="select"], [class*="dropdown"]');
                if (dropdown) checkDropdown(dropdown);
            }
        }, true);

        // 2. Mutation Observer para ver cambios en clases de selección o aria-activedescendant
        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                var el = mutation.target;
                if (mutation.type === 'attributes') {
                    var dropdown = el.closest('[role="combobox"], [role="listbox"], [class*="select"], [class*="dropdown"]');
                    if (dropdown) checkDropdown(dropdown);
                } else if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function (node) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            var dropdown = node.closest('[role="combobox"], [role="listbox"], [class*="select"], [class*="dropdown"]') || 
                                           node.querySelector('[role="combobox"], [role="listbox"], [class*="select"], [class*="dropdown"]');
                            if (dropdown) checkDropdown(dropdown);
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'aria-activedescendant', 'aria-selected', 'aria-expanded']
        });

        // Escaneo inicial rápido
        setTimeout(function () {
            var dropdowns = document.querySelectorAll('[role="combobox"], [role="listbox"], [class*="select"], [class*="dropdown"]');
            dropdowns.forEach(checkDropdown);
        }, 200);

        function reportIssue(dropdown, option, aSwell, msg, metrics) {
            var rect = option ? option.getBoundingClientRect() : dropdown.getBoundingClientRect();

            var detail = {
                timestamp: Date.now(),
                skill_id: typeof skill_id !== 'undefined' ? skill_id : 'dropdown-selector-with-Limited-Interaction',
                aSwell: aSwell,
                suggestions: "Asegúrate de sincronizar los cambios de estado visuales con atributos ARIA semánticos (aria-selected='true', aria-activedescendant). Si utilizas componentes personalizados, prefiere librerías con accesibilidad nativa como React Aria, Headless UI o Radix Primitives.",
                intent: "Interacción con custom selectors",
                confidence_metrics: metrics,
                htmlBefore: dropdown.outerHTML,
                htmlAfter: option ? option.outerHTML : 'N/A',
                label: (dropdown.getAttribute('aria-label') || dropdown.id || 'Dropdown Personalizado').substring(0, 80).trim(),
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
    window.AE["Limited Interaction Dropdown"] = new AEvent("Limited Interaction Dropdown");
})();
