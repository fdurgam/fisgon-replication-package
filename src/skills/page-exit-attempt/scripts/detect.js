(function() {
    function AEvent(threatName) {
        var self = this;
        this.threatName = threatName;
        this.events = [];
        this.lastUserInteraction = 0;

        function record(aSwell, suggestions, msg) {
            var entry = {
                timestamp: Date.now(),
                aSwell: aSwell,
                suggestions: suggestions,
                msg: msg || "Navegación o salida de página detectada."
            };
            self.events.push(entry);
            if (window.reportA11yIssue) window.reportA11yIssue({ type: self.threatName, ...entry });
        }

        document.addEventListener('keydown', function() { self.lastUserInteraction = Date.now(); }, true);
        document.addEventListener('mousedown', function() { self.lastUserInteraction = Date.now(); }, true);

        // 1. Exit-Confirmation-Muteness
        window.addEventListener('beforeunload', function(e) {
            // if (window.isFisgonSimulating) return;
            var event = new CustomEvent('AEvent:PageExitGlobal', {
                detail: {
                    type: 'beforeunload',
                    threatName: self.threatName,
                    engine: self
                }
            });
            window.dispatchEvent(event);
            record("Exit-Confirmation-Muteness", "Si bloqueas la salida con beforeunload, asegúrate de que el mensaje sea claro y que no interrumpa el flujo del lector de pantalla.", "Intento de salida de página bloqueado por el sistema.");
        });

        // 2. Auto-Redirect-Abduction
        var initialUrl = window.location.href;
        setInterval(function() {
            // if (window.isFisgonSimulating) return;
            if (window.location.href !== initialUrl) {
                var timeSinceInteraction = Date.now() - self.lastUserInteraction;
                var event = new CustomEvent('AEvent:PageExitGlobal', {
                    detail: {
                        type: 'urlchange',
                        timeSinceInteraction: timeSinceInteraction,
                        threatName: self.threatName,
                        engine: self
                    }
                });
                window.dispatchEvent(event);
                if (timeSinceInteraction > 5000) { // No interaction in 5s
                    record("Auto-Redirect-Abduction", "Evita redirecciones automáticas. Si son necesarias, anúncialas con antelación o permite que el usuario las cancele.", "Redirección automática detectada sin interacción previa.");
                }
                initialUrl = window.location.href;
            }
        }, 1000);

        // 3. History-API-Confusion
        var initialTitle = document.title;
        var _push = history.pushState;
        history.pushState = function() {
            if (window.isFisgonSimulating) return _push.apply(this, arguments);
            var res = _push.apply(this, arguments);
            setTimeout(function() {
                var event = new CustomEvent('AEvent:PageExitGlobal', {
                    detail: {
                        type: 'pushstate',
                        initialTitle: initialTitle,
                        currentTitle: document.title,
                        threatName: self.threatName,
                        engine: self
                    }
                });
                window.dispatchEvent(event);
                if (document.title === initialTitle) {
                    record("History-API-Confusion", "Al usar la History API para navegación SPA, actualiza siempre el <title> y mueve el foco al inicio de la nueva vista.", "Cambio de estado de historial sin actualización de título.");
                }
                initialTitle = document.title;
            }, 500);
            return res;
        };
    }

    if (!window.AE) window.AE = {};
    window.AE["Page Exit Attempt"] = new AEvent("Page Exit Attempt");
})();
