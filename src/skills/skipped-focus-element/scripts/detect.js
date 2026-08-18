(function () {
    function AEvent(threatName) {
        var self = this;
        this.threatName = threatName;
        this.events = [];
        this.lastFocus = null;
        this.visitedElements = new Set();

        document.addEventListener('focusin', function (e) {
            var el = e.target;
            if (el.closest && el.closest('[data-fisgon-ignore="true"]')) return;

            self.visitedElements.add(el);

            if (self.lastFocus) {
                // 1. Capturamos los elementos interactivos del DOM
                var focusables = Array.from(document.querySelectorAll('button, a[href], input, select, textarea, [tabindex="0"]'))
                    .filter(i => i.offsetParent !== null && !(i.closest && i.closest('[data-fisgon-ignore="true"]')));

                // 🔥 MEJORA CSS: Reordenar los elementos según su posición visual real en la pantalla
                focusables.sort(function (a, b) {
                    var rectA = a.getBoundingClientRect();
                    var rectB = b.getBoundingClientRect();

                    // Si un elemento está notablemente más arriba que otro, va primero
                    if (Math.abs(rectA.top - rectB.top) > 10) {
                        return rectA.top - rectB.top;
                    }
                    // Si están en la misma línea horizontal (aproximadamente), ordenamos de izquierda a derecha
                    return rectA.left - rectB.left;
                });

                // 2. El resto de la lógica matemática ahora trabaja sobre el orden VISUAL
                var prevIdx = focusables.indexOf(self.lastFocus);
                var currIdx = focusables.indexOf(el);

                if (prevIdx !== -1 && currIdx !== -1 && currIdx > prevIdx + 1) {
                    var skipped = focusables.slice(prevIdx + 1, currIdx).filter(function (s) {
                        var isRadio = s.tagName === 'INPUT' && s.type === 'radio';
                        if (isRadio && s.name) {
                            var form = s.form;
                            var groupQuery = 'input[type="radio"][name="' + s.name + '"]';
                            var group = form ? Array.from(form.querySelectorAll(groupQuery)) : Array.from(document.querySelectorAll(groupQuery));
                            var groupVisitedOrChecked = group.some(function (radio) {
                                return radio.checked || 
                                       radio === el || 
                                       radio === self.lastFocus || 
                                       self.visitedElements.has(radio);
                            });
                            if (groupVisitedOrChecked) {
                                return false; // Excluir del conteo de elementos saltados
                            }
                        }
                        return true;
                    });
                    if (skipped.length > 0) {
                        console.log(
                            "%c [Skipped Focus Element] 🔔 EVENTO DETECTADO ➔ Se detectó un salto en el flujo VISUAL. Elementos ignorados: " + skipped.length,
                            "color: #ffffff; background: #e91e63; font-weight: bold; padding: 5px 10px; border-radius: 4px;"
                        );

                        var event = new CustomEvent('AEvent:SkippedFocusGlobal', {
                            detail: { skipped: skipped, targetElement: el, lastFocusElement: self.lastFocus, threatName: self.threatName, engine: self }
                        });
                        window.dispatchEvent(event);

                        reportIssue(el, skipped, "Skipped-Visual-Element", "Se saltaron elementos en el orden visual de la pantalla.");
                    }
                }
            }
            self.lastFocus = el;
        }, true);

        function reportIssue(el, skipped, aSwell, msg) {
            var detail = {
                timestamp: Date.now(),
                skill_id: 'skipped-focus-element',
                aSwell: aSwell,
                suggestions: "El orden visual no coincide con el orden del foco. Revisa propiedades CSS como flex-direction, order, o position:absolute.",
                intent: "Navegación visual secuencial",
                confidence_metrics: { skipped_count: skipped.length },
                htmlBefore: "Elementos saltados visualmente: " + skipped.map(s => s.tagName).join(', '),
                htmlAfter: el.outerHTML,
                msg: msg
            };
            self.events.push(detail);
            if (window.reportA11yIssue) window.reportA11yIssue({ type: self.threatName, ...detail });
        }
    }

    if (!window.AE) window.AE = {};
    window.AE["Skipped Focus Element"] = new AEvent("Skipped Focus Element");
})();
/*
El script se envuelve en una función autoejecutable (IIFE) para no contaminar el alcance global, y realiza las siguientes tareas 
1.Escucha el movimiento del teclado (focusin)
El código añade un "escuchador de eventos" global para detectar cada vez que cualquier elemento de la página web recibe el foco
JavaScript
document.addEventListener('focusin', function (e) { ... }, true);
2.Filtra elementos ignorados
Si el elemento que acaba de recibir el foco (o alguno de sus padres) tiene el atributo HTML data-fisgon-ignore="true", el script lo ignora por completo y no hace nada.
3. Mapea y ordena visualmente la pantalla
al pasar de un elemento (self.lastFocus) a uno nuevo (el), el código busca todos los elementos interactivos de la página (botones, enlaces, inputs, etc.) que sean visibles (offsetParent !== null).
Luego, utiliza la función getBoundingClientRect() para obtener las coordenadas (X,Y) exactas de cada elemento en la pantalla y los ordena de arriba a abajo y de izquierda a derecha:
if (Math.abs(rectA.top - rectB.top) > 10) {
    return rectA.top - rectB.top; // Ordena por altura (más arriba va primero)
}
return
4.Detecta si hubo un "salto" (Skipped)
Una vez que tiene la lista de elementos ordenados tal y como los ve un ojo humano, busca qué posición tenía el elemento anterior (prevIdx) y qué posición tiene el nuevo (currIdx).
Flujo normal: Si estabamon en el elemento 1 y pasamos al elemento 2, la diferencia es normal.
Flujo roto (Salto): Si  estabamos en el elemento 1 y el foco saltó al elemento 5, significa que saltamos el 2, el 3 y el 4.
JavaScript
if (prevIdx !== -1 && currIdx !== -1 && currIdx > prevIdx + 1) {
    var skipped = focusables.slice(prevIdx + 1, currIdx);
    // ¡Alerta! Se saltaron elementos.
}
5. Reporta el error : dispara la detección de evento AEvent:SkippedFocusGlobal

*/