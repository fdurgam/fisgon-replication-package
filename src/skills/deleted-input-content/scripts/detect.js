(function () {
    function AEvent(threatName) {
        var self = this;
        this.threatName = threatName;
        this.events = [];
        this.elementStates = new WeakMap();
        this.lastActionTime = Date.now();

        document.addEventListener('keydown', function () { self.lastActionTime = Date.now(); }, true);
        document.addEventListener('mousedown', function () { self.lastActionTime = Date.now(); }, true);

        function isTextField(el) {
            if (!el || el.closest('[data-fisgon-ignore="true"]')) return false;
            var tag = el.tagName;
            return tag === 'TEXTAREA' || (tag === 'INPUT' && ['text', 'email', 'password', 'search', 'url', 'tel'].includes(el.type.toLowerCase()));
        }

        document.addEventListener('focusin', function (e) {
            var el = e.target;
            if (isTextField(el)) {
                self.elementStates.set(el, {
                    lastValue: el.value,
                    htmlBefore: el.outerHTML,
                    timestamp: Date.now()
                });
            }
        }, true);

        document.addEventListener('beforeinput', function (e) {
            var el = e.target;
            if (isTextField(el)) {
                var state = self.elementStates.get(el) || {};
                state.lastValue = el.value;
                state.htmlBefore = el.outerHTML;
                state.timestamp = Date.now();
                self.elementStates.set(el, state);
            }
        }, true);

        document.addEventListener('input', function (e) {
            var el = e.target;
            if (isTextField(el)) {
                var state = self.elementStates.get(el);
                if (state && state.lastValue.length > 0 && el.value.length === 0 && e.inputType !== 'deleteContentBackward') {

                    // 📢 LOG REQUERIDO POR TU GUÍA DE USAGE
                    console.log(
                        "%c 🔔 [Deleted Input Content] ➔ Event: Pérdida instantánea de datos detectada en fase de entrada de texto.",
                        "color: #ffffff; background: #e91e63; font-weight: bold; padding: 5px 10px; border-radius: 4px;"
                    );

                    // Despachamos canal de comunicación global para Smells
                    var event = new CustomEvent('AEvent:DeletedInputGlobal', {
                        detail: { el: el, state: state, type: "input-wipe", lastActionTime: self.lastActionTime, threatName: self.threatName, engine: self }
                    });
                    window.dispatchEvent(event);

                    reportIssue(el, "Controlled-Component-Wipe", "El contenido se borró durante la escritura.", state.htmlBefore);
                }
            }
        }, true);

        document.addEventListener('focusout', function (e) {
            var el = e.target;
            if (isTextField(el)) {
                var state = self.elementStates.get(el);
                if (state && state.lastValue.length > 0 && el.value.length === 0) {

                    // 📢 LOG REQUERIDO POR TU GUÍA DE USAGE
                    console.log(
                        "%c 🔔 [Deleted Input Content] ➔ Event: Datos eliminados al perder el foco del elemento.",
                        "color: #ffffff; background: #e91e63; font-weight: bold; padding: 5px 10px; border-radius: 4px;"
                    );

                    // Despachamos canal de comunicación global para Smells
                    var event = new CustomEvent('AEvent:DeletedInputGlobal', {
                        detail: { el: el, state: state, type: "focusout-wipe", lastActionTime: self.lastActionTime, threatName: self.threatName, engine: self }
                    });
                    window.dispatchEvent(event);

                    reportIssue(el, "Form-Reset-Collision", "El contenido se borró al perder el foco.", state.htmlBefore);
                }
            }
        }, true);

        function reportIssue(el, aSwell, suggestions, htmlBefore) {
            var rect = el.getBoundingClientRect();
            var confidence_metrics = {
                proximity_to_action: Date.now() - self.lastActionTime,
                value_length_before: htmlBefore.length
            };

            var detail = {
                timestamp: Date.now(),
                skill_id: typeof skill_id !== 'undefined' ? skill_id : 'deleted-input-content',
                aSwell: aSwell,
                suggestions: suggestions + " Revisa si el estado del componente reactivo o scripts de validación están reseteando el valor.",
                intent: confidence_metrics.proximity_to_action < 500 ? "Escritura del usuario" : "Validación asíncrona/Limpieza",
                confidence_metrics: confidence_metrics,
                htmlBefore: htmlBefore,
                htmlAfter: el.outerHTML,
                label: (el.labels && el.labels[0] ? el.labels[0].innerText : el.getAttribute('aria-label') || el.id || 'Desconocido').substring(0, 80).trim(),
                rect: { top: rect.top + window.scrollY, left: rect.left + window.scrollX, width: rect.width, height: rect.height },
                msg: "Contenido del input eliminado automáticamente."
            };
            self.events.push(detail);
            if (window.reportA11yIssue) window.reportA11yIssue({ type: self.threatName, ...detail });
        }
    }

    if (!window.AE) window.AE = {};
    window.AE["Deleted Input Content"] = new AEvent("Deleted Input Content");
})();
