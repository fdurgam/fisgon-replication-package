(function(skillId) {
    function AEvent(threatName) {
        var self = this;
        this.threatName = threatName;
        this.events = [];
        this.detect = false;
        this.tolerance = 20;
        this.skillId = skillId || "winding-tab-sequence";
        var eventQueue = [];
        var isShiftPressed = false;

        document.addEventListener('keydown', function(e) { 
            if (e.key === 'Shift') isShiftPressed = true; 
            console.log(`[WTS] KeyDown: ${e.key}, Shift: ${isShiftPressed}`);
        }, true);
        document.addEventListener('keyup', function(e) { 
            if (e.key === 'Shift') isShiftPressed = false; 
            console.log(`[WTS] KeyUp: ${e.key}, Shift: ${isShiftPressed}`);
        }, true);

        var canvas = document.createElement('canvas');
        canvas.style.cssText = "position:absolute; top:0; left:0; z-index:99999; pointer-events:none;";
        canvas.setAttribute('data-fisgon-ignore', 'true');
        canvas.setAttribute('aria-hidden', 'true');
        document.body.appendChild(canvas);
        var ctx = canvas.getContext('2d');

        function resize() {
            canvas.width = Math.max(document.documentElement.scrollWidth, window.innerWidth);
            canvas.height = Math.max(document.documentElement.scrollHeight, window.innerHeight);
        }
        window.addEventListener('resize', resize);
        setTimeout(resize, 500);

        function getAriaContext(el) {
            if (!el) return {};
            return {
                role: el.getAttribute('role'),
                ariaLabel: el.getAttribute('aria-label'),
                ariaLabelledby: el.getAttribute('aria-labelledby'),
                tabIndex: el.tabIndex,
                tagName: el.tagName,
                isInteractive: ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) || el.tabIndex >= 0
            };
        }

        function checkASmell(lastEl, currentEl, jump, rise) {
            if (!lastEl || !currentEl) return null;
            
            var lastStyle = window.getComputedStyle(lastEl.parentElement);
            var currStyle = window.getComputedStyle(currentEl.parentElement);
            
            if (lastStyle.flexDirection.includes('reverse') || lastStyle.order !== '0' || currStyle.order !== '0') {
                return {
                    aSwell: "DOM-Order-Anarchy",
                    suggestions: "El uso de 'flex-direction: reverse' o 'order' en CSS altera el orden visual sin cambiar el orden del DOM. Esto confunde a usuarios de lectores de pantalla.",
                    baseConfidence: 0.95
                };
            }
            
            if (currentEl.parentElement === document.body && lastEl.parentElement !== document.body) {
                return {
                    aSwell: "Dynamic-Portal-Injection",
                    suggestions: "Los elementos inyectados al final del <body> (Portals) aparecen al final de la secuencia de tabulación, aunque visualmente estén en medio.",
                    baseConfidence: 0.85
                };
            }

            if (jump > 500 && !isShiftPressed) {
                return {
                    aSwell: "Tab-Trap-Leak",
                    suggestions: "Un salto visual masivo sugiere que el foco se 'perdió' o se reseteó. Asegúrate de gestionar el foco tras acciones dinámicas.",
                    baseConfidence: 0.75
                };
            }
            
            // Fallback: Si hay un salto ascendente (rise > 0) y no es por las razones anteriores,
            // sigue siendo un Winding Tab Sequence porque el orden visual no coincide con el DOM.
            if (rise > self.tolerance) {
                return {
                    aSwell: "Non-Linear-DOM-Order",
                    suggestions: "Secuencia de tabulación no lineal: El foco saltó hacia arriba en la página. El orden de los elementos en el DOM debe coincidir con el orden visual (WCAG 1.3.2).",
                    baseConfidence: 0.7
                };
            }
            
            return null;
        }

        function getSelector(element) {
            if (element.id) return '#' + element.id;
            var path = [];
            while (element && element.nodeType === Node.ELEMENT_NODE) {
                var name = element.nodeName.toLowerCase();
                if (element.id) {
                    name += '#' + element.id;
                    path.unshift(name);
                    break;
                } else {
                    var sib = element, nth = 1;
                    while (sib = sib.previousElementSibling) {
                        if (sib.nodeName.toLowerCase() == name) nth++;
                    }
                    if (nth != 1) name += ':nth-of-type(' + nth + ')';
                }
                path.unshift(name);
                element = element.parentNode;
            }
            return path.join(' > ');
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            var last = null;
            eventQueue.forEach(function(p, i) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 100, 255, 0.6)';
                ctx.fill();
                
                if (last) {
                    ctx.beginPath();
                    ctx.moveTo(last.x, last.y);
                    ctx.lineTo(p.x, p.y);
                    
                    var rise = last.y - p.y;
                    var jumpMagnitude = Math.abs(rise);
                    var isJump = (i === eventQueue.length - 1 && !isShiftPressed && jumpMagnitude > self.tolerance);

                    if (isJump) {
                        console.log(`[WTS] JUMP DETECTED! From ${last.label} to ${p.label}. Rise: ${rise}, JumpMagnitude: ${jumpMagnitude}, Tolerance: ${self.tolerance}`);
                        ctx.strokeStyle = 'red';
                        ctx.lineWidth = 4;
                        ctx.stroke();

                        var smell = checkASmell(last.el, p.el, jumpMagnitude, rise);
                        if (smell) {
                            self.detect = true;
                            
                            // Cálculo de confianza científica
                            var confidence = smell.baseConfidence || 0.5;
                            if (jumpMagnitude > 1000) confidence = Math.min(1.0, confidence + 0.1);

                            var detail = {
                                type: self.threatName,
                                skill_id: self.skillId,
                                confidence_score: confidence,
                                timestamp: Date.now(),
                                jump: Math.round(rise),
                                aSwell: smell.aSwell,
                                suggestions: smell.suggestions,
                                origin: last.label,
                                destination: p.label,
                                selectorBefore: getSelector(last.el),
                                selectorAfter: getSelector(p.el),
                                originElement: {
                                    rect: last.el.getBoundingClientRect(),
                                    tag: last.el.tagName,
                                    role: last.el.getAttribute('role') || 'none'
                                },
                                destinationElement: {
                                    rect: p.el.getBoundingClientRect(),
                                    tag: p.el.tagName,
                                    role: p.el.getAttribute('role') || 'none'
                                },
                                htmlBefore: last.el.outerHTML,
                                htmlAfter: p.el.outerHTML,
                                evidence_context: JSON.stringify({
                                    before: getAriaContext(last.el),
                                    after: getAriaContext(p.el),
                                    jumpPx: jumpMagnitude,
                                    isShift: isShiftPressed
                                }),
                                skill_metadata: {
                                    tolerance: self.tolerance,
                                    queueLength: eventQueue.length,
                                    isReverseFlex: window.getComputedStyle(last.el.parentElement).flexDirection.includes('reverse')
                                }
                            };
                            self.events.push(detail);
                            if (window.reportA11yIssue) window.reportA11yIssue({ ...detail });
                        }
                    } else {
                        ctx.strokeStyle = 'rgba(0, 100, 255, 0.3)';
                        ctx.lineWidth = 2;
                        ctx.stroke();
                    }
                }
                last = p;
            });
        }

        document.addEventListener('focus', function(e) {
            // if (window.isFisgonSimulating) return; // Permitir detección durante simulación de teclado
            var el = e.target;
            if (el.closest && el.closest('[data-fisgon-ignore="true"]')) return;
            if (el === document.body || el === document.documentElement) return;
            var isGenericContainer = ['DIV', 'SECTION', 'ARTICLE', 'NAV', 'ASIDE', 'FORM', 'MAIN', 'HEADER', 'FOOTER'].includes(el.tagName);
            if (isGenericContainer && el.querySelector('button, a, input, select, textarea, [tabindex="0"]')) {
                return;
            }
            var rect = el.getBoundingClientRect();
            eventQueue.push({
                x: rect.left + window.scrollX + rect.width / 2,
                y: rect.top + window.scrollY + rect.height / 2,
                label: el.id || el.tagName,
                el: el
            });
            console.log(`[WTS] Focus on: ${el.id || el.tagName}, Queue size: ${eventQueue.length}`);
            if (eventQueue.length > 15) eventQueue.shift();
            resize();
            draw();
        }, true);

        document.addEventListener('mousedown', function(e) {
            if (window.isFisgonSimulating) return;
            if (!['INPUT','SELECT', 'TEXTAREA', 'BUTTON'].includes(e.target.tagName)) {
                eventQueue = [];
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }, true);
    }

    if (!window.AE) window.AE = {};
    window.AE["Winding Tab Sequence"] = new AEvent("Winding Tab Sequence");
})(typeof skill_id !== 'undefined' ? skill_id : 'winding-tab-sequence');
