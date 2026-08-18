(function () {
    const threat = "Modal Window Display";

    const styleId = 'aevent-modal-style';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            .a11y-modal-detected {
                outline: 4px solid #f44336 !important;
                outline-offset: -4px !important;
                box-shadow: 0 0 25px rgba(244, 67, 54, 0.8) !important;
                position: relative !important;
            }
            .a11y-modal-badge {
                position: absolute !important;
                top: 10px !important;
                right: 10px !important;
                background-color: #f44336 !important;
                color: #ffffff !important;
                font-family: Arial, sans-serif !important;
                font-size: 11px !important;
                font-weight: bold !important;
                padding: 4px 10px !important;
                border-radius: 4px !important;
                z-index: 2147483647 !important;
                pointer-events: none !important;
                white-space: nowrap !important;
                box-shadow: 0px 2px 5px rgba(0,0,0,0.3) !important;
            }
        `;
        document.head.appendChild(style);
    }

    function checkModal(node) {
        if (!node || node.nodeType !== 1) return;
        if (node.closest('[data-fisgon-ignore="true"]') || node.classList.contains('a11y-modal-badge')) return;

        const style = window.getComputedStyle(node);
        const esFlotante = style.position === 'fixed' || style.position === 'absolute';
        const esVisible = style.display !== 'none' && style.visibility !== 'hidden' && node.offsetWidth > 0;

        if (esFlotante && esVisible) {
            const zIndex = parseInt(style.zIndex, 10) || 0;
            const width = node.offsetWidth;
            const height = node.offsetHeight;
            const area = width * height;
            const viewportArea = window.innerWidth * window.innerHeight;
            const role = node.getAttribute('role');
            const classes = node.className.toLowerCase();

            // 🚫 FILTRO EXCLUSIÓN DE MENSAJES Y BANNERS (Como el de la UBA)
            const esAlertaOBanner = height < 90 ||
                ['alert', 'error', 'msg', 'message', 'toast', 'notification', 'banner'].some(k => classes.includes(k)) ||
                role === 'alert' || role === 'status';

            if (esAlertaOBanner) return;

            // Heurística de Modal Real (Gran tamaño o rol dialog explícito)
            if (zIndex > 100 && (role === 'dialog' || role === 'alertdialog' || area > (viewportArea * 0.15))) {
                if (node.dataset.a11yAudited === "true") return;
                node.dataset.a11yAudited = "true";
                setTimeout(() => { node.dataset.a11yAudited = "false"; }, 1000);

                node.classList.add('a11y-modal-detected');
                const badge = document.createElement('span');
                badge.className = 'a11y-modal-badge';
                badge.innerText = '🔴 Ventana Modal Detectada';
                node.appendChild(badge);

                console.log(`%c 🔔 [AEvent ${threat}] ➔ Modal Capturado:`, "color: #ffffff; background: #f44336; font-weight: bold; padding: 4px 8px; border-radius: 4px;", node);

                window.dispatchEvent(new CustomEvent('AEvent:ModalDetectedGlobal', {
                    detail: { node: node, threatName: threat }
                }));
            }
        }
    }

    (function AEvent() {
        const observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        checkModal(node);
                        if (node.querySelectorAll) node.querySelectorAll('*').forEach(checkModal);
                    });
                }
                if (mutation.type === 'attributes' && (mutation.attributeName === 'class' || mutation.attributeName === 'style')) {
                    setTimeout(() => checkModal(mutation.target), 100);
                }
            });
        });
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
        console.log("%c 🚀 [Filtro Modales Activo] Las ventanas de diálogo grandes se marcarán en ROJO. ", "color: #f44336; font-weight: bold;");
    })();
})();