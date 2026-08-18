(function() {
    function AEvent(threatName) {
        var self = this;
        this.threatName = threatName;
        this.events = [];

        function report(aSwell, suggestions, msg, htmlBefore, htmlAfter) {
            var detail = {
                timestamp: Date.now(),
                aSwell: aSwell,
                suggestions: suggestions,
                htmlBefore: htmlBefore || null,
                htmlAfter: htmlAfter || null,
                msg: msg || "Problema en el flujo de envío del formulario."
            };
            self.events.push(detail);
            if (window.reportA11yIssue) window.reportA11yIssue({ type: self.threatName, ...detail });
        }

        document.addEventListener('submit', function(e) {
            // if (window.isFisgonSimulating) return;
            var form = e.target;
            if (form.closest && form.closest('[data-fisgon-ignore="true"]')) return;
            var htmlBefore = form.outerHTML;
            var submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
            var initialUrl = window.location.href;
            var initialTitle = document.title;

            // CANAL DE COMUNICACIÓN GLOBAL: Despachamos para los Smells
            var event = new CustomEvent('AEvent:FormSubmissionGlobal', {
                detail: {
                    form: form,
                    submitButton: submitButton,
                    initialUrl: initialUrl,
                    initialTitle: initialTitle,
                    threatName: self.threatName,
                    engine: self
                }
            });
            window.dispatchEvent(event);

            setTimeout(function() {
                var currentUrl = window.location.href;
                var currentTitle = document.title;
                var htmlAfter = form.outerHTML;
                var hasLiveRegion = !!document.querySelector('[aria-live="polite"], [aria-live="assertive"], [role="alert"]');
                
                // 1. Validation-Dead-End
                if (currentUrl === initialUrl && !hasLiveRegion) {
                    report("Validation-Dead-End", "Si la validación falla, muestra un mensaje con role='alert' o mueve el foco al primer error detectado.", "El envío se detuvo sin aviso al usuario (silencio de validación).", htmlBefore, htmlAfter);
                }

                // 2. Submission-Black-Hole
                if (submitButton && submitButton.disabled && currentUrl === initialUrl) {
                    setTimeout(function() {
                        if (submitButton.disabled && !document.querySelector('[role="alert"], [aria-live]')) {
                            report("Submission-Black-Hole", "No dejes el botón de envío deshabilitado indefinidamente sin informar el progreso o el error al usuario.", "El botón permanece deshabilitado tras el intento de envío.", htmlBefore, submitButton.outerHTML);
                        }
                    }, 3000);
                }

                // 3. Implicit-Submission-Disorientation
                if (currentUrl !== initialUrl && currentTitle === initialTitle) {
                    report("Implicit-Submission-Disorientation", "Actualiza siempre el título de la página (<title>) o usa un anuncio aria-live tras una navegación exitosa en SPAs.", "La URL cambió pero el título de la página sigue siendo el mismo.", initialTitle, currentTitle);
                }

            }, 2000);
        }, true);
    }

    if (!window.AE) window.AE = {};
    window.AE["Form Submission Accessibility"] = new AEvent("Form Submission Accessibility");
})();
