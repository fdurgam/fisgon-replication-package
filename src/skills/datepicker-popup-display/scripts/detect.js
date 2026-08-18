(function () {
    const threat = "Datepicker Popup Display";

    // 1. Inyectar estilos específicos para Datepickers sin alterar el DOM original
    const styleId = 'aevent-datepicker-style';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            /* Recuadro exterior para no romper paddings ni margins internos */
            .a11y-datepicker-detected {
                outline: 4px solid #009688 !important; /* Verde Teal */
                outline-offset: -4px !important;
                box-shadow: 0 0 25px rgba(0, 150, 136, 0.8) !important;
            }
            
            /* Cartel flotante absoluto (Independiente del Datepicker) */
            .a11y-datepicker-badge {
                position: fixed !important;
                background-color: #009688 !important;
                color: #ffffff !important;
                font-family: Arial, sans-serif !important;
                font-size: 11px !important;
                font-weight: bold !important;
                padding: 4px 8px !important;
                border-radius: 4px !important;
                z-index: 2147483647 !important; /* Por encima de todo */
                pointer-events: none !important;
                white-space: nowrap !important;
                box-shadow: 0px 2px 5px rgba(0,0,0,0.3) !important;
                animation: a11y-datepicker-fade 0.3s ease-out !important;
            }
            @keyframes a11y-datepicker-fade {
                from { opacity: 0; transform: translateY(5px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }

    let activeBadge = null;
    let activeDatePickerNode = null;

    // Posiciona el cartel flotando justo encima del Datepicker sin meterlo dentro de su HTML
    function posicionarBadgeIndependiente(el, badge) {
        const rect = el.getBoundingClientRect();
        badge.style.top = (rect.top - 26) + 'px'; // 26px arriba del borde superior
        badge.style.left = rect.left + 'px';
    }

    function cleanPreviousBadge() {
        if (activeBadge) {
            activeBadge.remove();
            activeBadge = null;
        }
        if (activeDatePickerNode) {
            activeDatePickerNode.classList.remove('a11y-datepicker-detected');
            activeDatePickerNode = null;
        }
    }

    function checkDatepicker(node) {
        if (!node || node.nodeType !== 1) return;
        if (node.closest('[data-fisgon-ignore="true"]') || node.classList.contains('a11y-datepicker-badge')) return;

        const style = window.getComputedStyle(node);
        const esFlotante = style.position === 'fixed' || style.position === 'absolute';
        const esVisible = style.display !== 'none' && style.visibility !== 'hidden' && node.offsetWidth > 0;

        if (esFlotante && esVisible) {
            const classes = node.className.toLowerCase();
            const id = node.id.toLowerCase();

            // Heurística de detección de calendarios
            const esCalendario = ['datepicker', 'calendar', 'flatpickr', 'pickadate', 'ui-datepicker'].some(k => classes.includes(k)) ||
                id.includes('datepicker') ||
                node.querySelector('.ui-datepicker-calendar') ||
                classes.includes('ui-datepicker');

            if (esCalendario) {
                // Evitar spam de detecciones
                if (node.dataset.a11yCalendarAudited === "true") return;
                node.dataset.a11yCalendarAudited = "true";
                setTimeout(() => { node.dataset.a11yCalendarAudited = "false"; }, 1000);

                // Limpiamos el cartel anterior si existiese
                cleanPreviousBadge();

                activeDatePickerNode = node;
                node.classList.add('a11y-datepicker-detected');

                // Creamos el cartel en el BODY para que flote libremente
                activeBadge = document.createElement('span');
                activeBadge.className = 'a11y-datepicker-badge';
                activeBadge.innerText = '📅 Selector de Fecha / Calendario Detectado';
                document.body.appendChild(activeBadge);

                posicionarBadgeIndependiente(node, activeBadge);

                // 📢 REPORTE IMPECABLE POR CONSOLA
                console.group(`%c 📅 [AEvent ${threat}] `, "background: #009688; color: #fff; padding: 3px 8px; font-weight: bold; border-radius: 3px;");
                console.log("Elemento del Calendario:", node);
                console.log("Dimensiones físicas:", `${node.offsetWidth}px x ${node.offsetHeight}px`);
                console.groupEnd();

                // Dispatch de evento para el analizador de Smells de la Parte 2
                window.dispatchEvent(new CustomEvent('AEvent:DatepickerDetectedGlobal', {
                    detail: { node: node, threatName: threat }
                }));
            }
        }
    }

    // AEvent Constructor (MutationObserver)
    (function AEvent() {
        const observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        checkDatepicker(node);
                        if (node.querySelectorAll) node.querySelectorAll('*').forEach(checkDatepicker);
                    });
                }
                if (mutation.type === 'attributes' && (mutation.attributeName === 'class' || mutation.attributeName === 'style')) {
                    setTimeout(() => checkDatepicker(mutation.target), 100);
                }
            });
        });

        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });

        // Vigilar si el Datepicker se cierra para limpiar el cartel de la pantalla inmediatamente
        document.addEventListener('mousedown', function (e) {
            if (activeDatePickerNode && !activeDatePickerNode.contains(e.target)) {
                // Si el usuario hace clic fuera, asumimos que el calendario se va a cerrar y limpiamos
                setTimeout(cleanPreviousBadge, 150);
            }
        }, true);

        // Reposicionar dinámicamente si hay scroll o resize de pantalla
        window.addEventListener('resize', () => {
            if (activeDatePickerNode && activeBadge) posicionarBadgeIndependiente(activeDatePickerNode, activeBadge);
        });
        window.addEventListener('scroll', () => {
            if (activeDatePickerNode && activeBadge) posicionarBadgeIndependiente(activeDatePickerNode, activeBadge);
        });

        console.log("%c 🚀 [Detector Datepickers Seguro] Activo. Reportes impecables en consola y pantalla sin alterar los estilos del input. ", "color: #009688; font-weight: bold;");
    })();
})();