(function () {
    function AEvent(threatName) {
        var self = this;
        this.threatName = threatName;
        this.events = [];
        this.tabCount = 0;
        this.focusPath = [];
        this.visitedFields = new Set();

        function checkFocusLoop(path) {
            if (path.length < 4) return null;
            // Detectar bucles de tamaño 2, 3 o 4
            for (var size = 2; size <= 4; size++) {
                if (path.length >= size * 2) {
                    var chunk1 = path.slice(-size);
                    var chunk2 = path.slice(-size * 2, -size);
                    var match = true;
                    for (var i = 0; i < size; i++) {
                        if (chunk1[i] !== chunk2[i]) {
                            match = false;
                            break;
                        }
                    }
                    if (match) return { size: size, elements: chunk1 };
                }
            }
            return null;
        }

        function resetTracking() {
            self.tabCount = 0;
            self.focusPath = [];
            self.visitedFields.clear();
        }

        // Detectar clics de ratón para reiniciar conteo
        document.addEventListener('mousedown', function () {
            resetTracking();
        }, true);

        // Detectar envíos de formularios para reiniciar
        document.addEventListener('submit', function () {
            resetTracking();
        }, true);

        // Detectar cambios en campos (mutaciones exitosas de valor) para reiniciar
        document.addEventListener('change', function () {
            resetTracking();
        }, true);

        // Detectar pulsación de teclas
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Tab') {
                self.tabCount++;
                
                // Pequeño timeout para que el foco cambie en el DOM
                setTimeout(function () {
                    var activeEl = document.activeElement;
                    if (activeEl && activeEl !== document.body) {
                        self.focusPath.push(activeEl);
                        if (self.focusPath.length > 12) self.focusPath.shift();

                        // Contabilizar campos útiles visitados
                        var tag = activeEl.tagName;
                        var isUseful = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(tag);
                        if (isUseful) {
                            self.visitedFields.add(activeEl);
                        }
                    }

                    // Despachamos al analizador de Smells
                    var event = new CustomEvent('AEvent:FrequentTabGlobal', {
                        detail: {
                            activeElement: activeEl,
                            tabCount: self.tabCount,
                            focusPath: self.focusPath,
                            visitedFieldsCount: self.visitedFields.size,
                            loopDetails: checkFocusLoop(self.focusPath),
                            threatName: self.threatName,
                            engine: self
                        }
                    });
                    window.dispatchEvent(event);
                }, 50);
            } else {
                if (e.key !== 'Shift') {
                    // Si escribe o interactúa con otra tecla, consideramos que es progreso
                    resetTracking();
                }
            }
        }, true);

        console.log("%c 🚀 [AEvent Frequent Tab] Registrado y vigilando la tecla Tab... ", "color: #e91e63; font-weight: bold;");
    }

    if (!window.AE) window.AE = {};
    window.AE["Frequent Tab"] = new AEvent("Frequent Tab");
})();
