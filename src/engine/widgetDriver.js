/**
 * widgetDriver.js — Motor de Interacción por Teclado para Fisgón
 * 
 * Responsabilidad: Clasificar el widget enfocado y ejecutar la secuencia
 * de teclado correcta según WAI-ARIA Authoring Practices.
 * 
 * Separación de Responsabilidades:
 *   - Gemini decide QUÉ dato inyectar
 *   - widgetDriver decide CÓMO interactuar por teclado
 * 
 * Referencia: https://www.w3.org/WAI/ARIA/apg/patterns/
 */

// ---------------------------------------------------------------------------
// 0. HEALTH CHECK — Valida el estado del motor antes de cada acción
// ---------------------------------------------------------------------------

/**
 * Verifica si la página y el contexto de ejecución siguen vivos.
 * Previene el fatídico "Target closed" o "Execution context was destroyed".
 */
async function checkPageHealth(page) {
    if (!page || page.isClosed()) {
        throw new Error("Página cerrada o inaccesible");
    }
    // Verificación rápida de contexto
    try {
        await page.evaluate(() => 1);
        return true;
    } catch (e) {
        if (e.message.includes('context was destroyed')) {
            // Intentar esperar un poco por estabilización
            await new Promise(r => setTimeout(r, 500));
            return true;
        }
        throw e;
    }
}

// ---------------------------------------------------------------------------
// 1. EXTRACTOR — Lee el perfil completo del widget enfocado desde el browser
// ---------------------------------------------------------------------------

/**
 * Ejecuta page.evaluate() para extraer un perfil enriquecido del elemento enfocado.
 * Incluye atributos ARIA, contexto del formulario y señales heurísticas.
 * @param {import('puppeteer').Page} page
 * @returns {Promise<object|null>} widgetProfile o null si no hay elemento enfocado
 */
export async function extractWidgetProfile(page) {
    try {
        return await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body || el.tagName === 'BODY' || el.tagName === 'HTML') return null;

        const rect = el.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(el);

        // Recoger label desde múltiples fuentes
        const labelText = (
            el.labels?.[0]?.innerText ||
            el.getAttribute('aria-label') ||
            el.getAttribute('aria-labelledby') && document.getElementById(el.getAttribute('aria-labelledby'))?.innerText ||
            el.getAttribute('placeholder') ||
            el.getAttribute('title') ||
            el.innerText?.substring(0, 80) ||
            el.id ||
            'Desconocido'
        ).trim();

        // Atributos ARIA relevantes
        const ariaAttrs = {};
        const ariaNames = [
            'aria-expanded', 'aria-haspopup', 'aria-autocomplete', 'aria-multiline',
            'aria-required', 'aria-invalid', 'aria-checked', 'aria-selected',
            'aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-valuetext',
            'aria-controls', 'aria-owns', 'aria-activedescendant', 'aria-orientation',
            'aria-pressed', 'aria-readonly', 'aria-disabled', 'aria-describedby'
        ];
        for (const attr of ariaNames) {
            const val = el.getAttribute(attr);
            if (val !== null) ariaAttrs[attr] = val;
        }

        // Contexto del padre (para detectar radio groups, tablists, menus, etc.)
        const parent = el.parentElement;
        const parentRole = parent ? (parent.getAttribute('role') || parent.tagName) : null;
        const grandparentRole = parent?.parentElement ? (parent.parentElement.getAttribute('role') || parent.parentElement.tagName) : null;

        // Datos del select nativo
        let selectOptions = null;
        if (el.tagName === 'SELECT') {
            selectOptions = {
                count: el.options.length,
                selectedIndex: el.selectedIndex,
                selectedText: el.options[el.selectedIndex]?.text || '',
                availableOptions: Array.from(el.options).slice(0, 30).map(o => o.text.trim()).filter(t => t !== '')
            };
        }

        // Datos de radio group
        let radioGroupInfo = null;
        if (el.type === 'radio' && el.name) {
            const form = el.closest('form');
            if (form) {
                const radios = Array.from(form.querySelectorAll(`input[type="radio"][name="${el.name}"]`));
                radioGroupInfo = {
                    count: radios.length,
                    currentIndex: radios.indexOf(el),
                    options: radios.map(r => r.labels?.[0]?.innerText?.trim() || r.value || r.id).slice(0, 10)
                };
            }
        }

        // Detección de datalist asociado
        const datalistId = el.getAttribute('list');
        let datalistOptions = null;
        if (datalistId) {
            const dl = document.getElementById(datalistId);
            if (dl) {
                datalistOptions = Array.from(dl.options).map(o => o.value).slice(0, 10);
            }
        }

        // Generador de selector CSS único
        const getSelector = (element) => {
            if (element.id) return `#${CSS.escape(element.id)}`;
            let path = [];
            while (element && element.nodeType === Node.ELEMENT_NODE) {
                let name = element.nodeName.toLowerCase();
                if (element.id) {
                    name += `#${CSS.escape(element.id)}`;
                    path.unshift(name);
                    break;
                } else {
                    let sib = element, nth = 1;
                    while (sib = sib.previousElementSibling) {
                        if (sib.nodeName.toLowerCase() == name) nth++;
                    }
                    if (nth != 1) name += `:nth-of-type(${nth})`;
                }
                path.unshift(name);
                element = element.parentNode;
            }
            return path.join(' > ');
        };

        // Generador de XPath unívoco para recuperación de foco
        const getXPath = (element) => {
            if (!element || element.nodeType !== 1) return '';
            if (element.id) return `//*[@id="${element.id}"]`;
            const sPath = [];
            while (element.nodeType === 1) {
                let sibCount = 0;
                let sibIndex = 0;
                for (let sib = element.parentNode?.firstChild; sib; sib = sib.nextSibling) {
                    if (sib.nodeType === 1 && sib.tagName === element.tagName) {
                        sibCount++;
                        if (sib === element) sibIndex = sibCount;
                    }
                }
                const tagName = element.tagName.toLowerCase();
                const pathIndex = (sibCount > 1 ? `[${sibIndex}]` : '');
                sPath.unshift(`${tagName}${pathIndex}`);
                element = element.parentNode;
                if (!element || element.tagName === 'HTML') break;
            }
            return `/${sPath.join('/')}`;
        };

        // Enriquecimiento de navegación: detectar si el elemento podría abandonar la página
        const href = el.getAttribute('href') || null;
        const isExternalLink = href && !href.startsWith('#') && !href.startsWith('javascript') && href !== '';

        // Progreso del formulario actual: cuántos campos de texto/select ya tienen valor
        let formProgress = null;
        const closestForm = el.closest('form');
        if (closestForm) {
            const allInteractive = Array.from(closestForm.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea'));
            const filled = allInteractive.filter(f => f.value && f.value.trim() !== '').length;
            formProgress = { total: allInteractive.length, filled };
        }

        return {
            // Core
            tag: el.tagName,
            type: el.type || el.getAttribute('type') || '',
            role: (el.getAttribute('role') || '').toLowerCase(),
            nativeRole: el.tagName.toLowerCase(),
            label: labelText,
            id: el.id || '',
            name: el.getAttribute('name') || '',
            value: el.value || el.innerText?.substring(0, 200) || '',
            xpath: getXPath(el),
            selector: getSelector(el),
            outerHTML: el.outerHTML,

            // HTML constraints
            maxlength: el.getAttribute('maxlength'),
            minlength: el.getAttribute('minlength'),
            pattern: el.getAttribute('pattern'),
            inputmode: el.getAttribute('inputmode'),
            autocomplete: el.getAttribute('autocomplete'),
            required: el.required || el.getAttribute('aria-required') === 'true',
            disabled: el.disabled || el.getAttribute('aria-disabled') === 'true',
            readonly: el.readOnly || el.getAttribute('aria-readonly') === 'true',
            tabindex: el.getAttribute('tabindex'),

            // ARIA
            aria: ariaAttrs,

            // Context
            parentRole: parentRole?.toLowerCase() || null,
            grandparentRole: grandparentRole?.toLowerCase() || null,
            isInForm: !!el.closest('form'),
            formAction: el.closest('form')?.getAttribute('action') || null,

            // Navegación: datos para evaluar si el elemento abandona la página
            href,
            isExternalLink: !!isExternalLink,
            formProgress,

            // Enrichments
            selectOptions,
            radioGroupInfo,
            datalistOptions,

            // Position
            rect: {
                top: Math.round(rect.top + window.scrollY),
                left: Math.round(rect.left + window.scrollX),
                topView: Math.round(rect.top),
                leftView: Math.round(rect.left),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
            }
        };
    });
    } catch (e) {
        if (e.message.includes('context was destroyed') || e.message.includes('detached Frame') || e.message.includes('Target closed') || e.message.includes('Session closed')) {
            return null;
        }
        throw e;
    }
}


// ---------------------------------------------------------------------------
// 2. CLASIFICADOR — Determina el tipo de widget a partir del perfil extraído
// ---------------------------------------------------------------------------

const WIDGET_TYPES = {
    TEXT: 'text',
    EMAIL: 'email',
    PASSWORD: 'password',
    TEL: 'tel',
    NUMBER: 'number',
    SEARCH: 'search',
    URL: 'url',
    DATE_NATIVE: 'date_native',
    TEXTAREA: 'textarea',
    CHECKBOX: 'checkbox',
    RADIO: 'radio',
    SELECT_NATIVE: 'select_native',
    COMBOBOX: 'combobox',
    SLIDER: 'slider',
    SWITCH: 'switch',
    SPINBUTTON: 'spinbutton',
    BUTTON: 'button',
    SUBMIT: 'submit',
    LINK: 'link',
    TAB: 'tab',
    MENUITEM: 'menuitem',
    DATALIST_INPUT: 'datalist_input',
    GRIDCELL: 'gridcell',
    UNKNOWN: 'unknown'
};

/**
 * Clasifica el widget enfocado en un tipo conocido.
 * @param {object} profile - Perfil extraído por extractWidgetProfile
 * @returns {string} Uno de los valores de WIDGET_TYPES
 */
export function classifyWidget(profile) {
    if (!profile) return WIDGET_TYPES.UNKNOWN;

    const { tag, type, role, aria } = profile;
    const tagUp = tag.toUpperCase();
    const typeLow = type.toLowerCase();

    // --- ARIA roles explícitos (tienen prioridad sobre tag) ---
    if (role === 'combobox') return WIDGET_TYPES.COMBOBOX;
    if (role === 'slider') return WIDGET_TYPES.SLIDER;
    if (role === 'switch') return WIDGET_TYPES.SWITCH;
    if (role === 'spinbutton') return WIDGET_TYPES.SPINBUTTON;
    if (role === 'tab') return WIDGET_TYPES.TAB;
    if (role === 'menuitem' || role === 'menuitemcheckbox' || role === 'menuitemradio') return WIDGET_TYPES.MENUITEM;
    if (role === 'searchbox') return WIDGET_TYPES.SEARCH;
    if (role === 'checkbox') return WIDGET_TYPES.CHECKBOX;
    if (role === 'radio') return WIDGET_TYPES.RADIO;
    if (role === 'button') return WIDGET_TYPES.BUTTON;
    if (role === 'link') return WIDGET_TYPES.LINK;
    if (role === 'gridcell') return WIDGET_TYPES.GRIDCELL;
    if (role === 'textbox' && aria?.['aria-multiline'] === 'true') return WIDGET_TYPES.TEXTAREA;
    if (role === 'textbox') return WIDGET_TYPES.TEXT;

    // --- Tags HTML nativos ---
    if (tagUp === 'SELECT') return WIDGET_TYPES.SELECT_NATIVE;
    if (tagUp === 'TEXTAREA') return WIDGET_TYPES.TEXTAREA;
    if (tagUp === 'A') return WIDGET_TYPES.LINK;
    if (tagUp === 'BUTTON') return WIDGET_TYPES.BUTTON;

    // --- Inputs por type ---
    if (tagUp === 'INPUT') {
        if (typeLow === 'checkbox') return WIDGET_TYPES.CHECKBOX;
        if (typeLow === 'radio') return WIDGET_TYPES.RADIO;
        if (typeLow === 'submit' || typeLow === 'button' || typeLow === 'reset') return WIDGET_TYPES.SUBMIT;
        if (typeLow === 'email') return WIDGET_TYPES.EMAIL;
        if (typeLow === 'password') return WIDGET_TYPES.PASSWORD;
        if (typeLow === 'tel') return WIDGET_TYPES.TEL;
        if (typeLow === 'number') return WIDGET_TYPES.NUMBER;
        if (typeLow === 'search') return WIDGET_TYPES.SEARCH;
        if (typeLow === 'url') return WIDGET_TYPES.URL;
        if (typeLow === 'date' || typeLow === 'datetime-local' || typeLow === 'month' || typeLow === 'week' || typeLow === 'time') return WIDGET_TYPES.DATE_NATIVE;
        if (typeLow === 'range') return WIDGET_TYPES.SLIDER;

        // Input con datalist asociado
        if (profile.datalistOptions) return WIDGET_TYPES.DATALIST_INPUT;

        // Input con aria-haspopup (posible combobox custom sin role)
        if (aria?.['aria-haspopup'] || aria?.['aria-autocomplete']) return WIDGET_TYPES.COMBOBOX;

        // Fallback: input de texto genérico
        return WIDGET_TYPES.TEXT;
    }

    // --- DIV/SPAN con comportamiento interactivo ---
    if (tagUp === 'DIV' || tagUp === 'SPAN') {
        if (profile.tabindex !== null) return WIDGET_TYPES.BUTTON;
    }

    return WIDGET_TYPES.UNKNOWN;
}


// ---------------------------------------------------------------------------
// 3. EJECUTOR — Realiza la secuencia de teclado según el tipo de widget
// ---------------------------------------------------------------------------

/**
 * Descripciones humanas de cada tipo de widget (para logs y UI).
 */
const WIDGET_LABELS = {
    [WIDGET_TYPES.TEXT]: 'Campo de Texto',
    [WIDGET_TYPES.EMAIL]: 'Campo de Email',
    [WIDGET_TYPES.PASSWORD]: 'Campo de Contraseña',
    [WIDGET_TYPES.TEL]: 'Campo de Teléfono',
    [WIDGET_TYPES.NUMBER]: 'Campo Numérico',
    [WIDGET_TYPES.SEARCH]: 'Campo de Búsqueda',
    [WIDGET_TYPES.URL]: 'Campo de URL',
    [WIDGET_TYPES.DATE_NATIVE]: 'Selector de Fecha Nativo',
    [WIDGET_TYPES.TEXTAREA]: 'Área de Texto',
    [WIDGET_TYPES.CHECKBOX]: 'Casilla de Verificación',
    [WIDGET_TYPES.RADIO]: 'Botón de Radio',
    [WIDGET_TYPES.SELECT_NATIVE]: 'Lista Desplegable',
    [WIDGET_TYPES.COMBOBOX]: 'Cuadro Combinado',
    [WIDGET_TYPES.SLIDER]: 'Control Deslizante',
    [WIDGET_TYPES.SWITCH]: 'Interruptor',
    [WIDGET_TYPES.SPINBUTTON]: 'Control Numérico (Spin)',
    [WIDGET_TYPES.BUTTON]: 'Botón',
    [WIDGET_TYPES.SUBMIT]: 'Botón de Envío',
    [WIDGET_TYPES.LINK]: 'Enlace',
    [WIDGET_TYPES.TAB]: 'Pestaña',
    [WIDGET_TYPES.MENUITEM]: 'Elemento de Menú',
    [WIDGET_TYPES.DATALIST_INPUT]: 'Campo con Autosugerencias',
    [WIDGET_TYPES.GRIDCELL]: 'Celda de Cuadrícula',
    [WIDGET_TYPES.UNKNOWN]: 'Desconocido'
};

const wait = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Simula el tipeo humano con tiempos variables, pausas aleatorias y ráfagas.
 * @param {object} keyboard - Puppeteer keyboard instance
 * @param {string} text - Texto a tipear
 * @param {number} [keyDelayMs=80] - Delay base entre pulsaciones (ms). Configurable por sesión.
 */
async function humanType(keyboard, text, keyDelayMs = 80) {
    if (!text) return;
    const chars = String(text).split('');

    for (let i = 0; i < chars.length; i++) {
        // Variabilidad humana: ráfagas rápidas (30%) vs. escritura normal (70%)
        // El delay se escala desde keyDelayMs como base mínima
        const isBurst = Math.random() > 0.7;
        const delay = isBurst
            ? Math.floor(keyDelayMs * 0.25) + Math.floor(Math.random() * keyDelayMs * 0.5)
            : keyDelayMs + Math.floor(Math.random() * keyDelayMs * 1.5);
        await keyboard.type(chars[i], { delay });

        // Pausas de duda ocasionales (simula usuario procesando con lector de pantalla)
        if (Math.random() > 0.88) {
            await wait(keyDelayMs * 3 + Math.floor(Math.random() * 600));
        }
    }
}

/**
 * Tiempo de "reflexión" biológica antes de actuar sobre un widget.
 * Simula al usuario procesando la información del lector de pantalla.
 */
async function cognitivePause(complexity = 'low') {
    const base = complexity === 'high' ? 2000 : 800;
    await wait(Math.floor(Math.random() * base) + 500);
}

/**
 * Ejecuta la interacción por teclado correcta para el tipo de widget.
 * @param {import('puppeteer').Page} page
 * @param {string} widgetType - Resultado de classifyWidget()
 * @param {object} profile - Perfil del widget
 * @param {string|number|null} value - Valor a inyectar (del Gemini)
 * @param {number} [keyDelayMs=80] - Delay base entre pulsaciones de teclado (ms).
 * @returns {Promise<{executed: boolean, action: string, description: string}>}
 */
export async function executeWidgetInteraction(page, widgetType, profile, value, keyDelayMs = 80) {
    const keyboard = page.keyboard;

    // GUARDIA DE SEGURIDAD: No interactuar si el elemento está deshabilitado o es de solo lectura
    if (profile.disabled || profile.readonly) {
        return { executed: false, action: 'skip', description: 'Elemento deshabilitado o readonly' };
    }

    let alreadyOpened = false;

    // ACTIVACIÓN ROBUSTA (V11.2): Scroll, Foco y Click en coordenadas de Viewport (Puppeteer friendly)
    await checkPageHealth(page);
    try {
        await page.evaluate((xpath) => {
            const el = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            if (el && typeof el.focus === 'function') {
                el.scrollIntoView({ block: 'center', behavior: 'smooth' });
                el.focus();
            }
        }, profile.xpath);
        await wait(800);

        // ACTIVACIÓN DE COMBOS (Sugerencia Usuario): Desplegar/activar RIA

        if (widgetType === WIDGET_TYPES.SELECT_NATIVE || widgetType === WIDGET_TYPES.COMBOBOX) {
            const isInput = profile.tag === 'INPUT';
            if (isInput) {
                // Para inputs (combos), flecha abajo es más seguro que Space (evita caracteres)
                await keyboard.press('ArrowDown');
            } else {
                await keyboard.press('Space');
            }
            await wait(1200);
            alreadyOpened = true; // Registramos que el elemento ya fue activado
        }
    } catch (actErr) {
        console.warn(`[V11.2] Error en pre-activación: ${actErr.message}`);
    }

    try {
        // Guard against undefined values
        const safeValue = (value === undefined || value === null) ? '' : value;

        switch (widgetType) {

            // --- CAMPOS DE TEXTO (todos siguen el mismo patrón) ---
            case WIDGET_TYPES.TEXT:
            case WIDGET_TYPES.EMAIL:
            case WIDGET_TYPES.PASSWORD:
            case WIDGET_TYPES.TEL:
            case WIDGET_TYPES.NUMBER:
            case WIDGET_TYPES.URL: {
                await cognitivePause('low');
                await checkPageHealth(page);
                // Limpiar campo si es posible (Ctrl+A, Backspace) de forma humana
                await keyboard.down('Control');
                await keyboard.press('a');
                await keyboard.up('Control');
                await wait(200);
                await keyboard.press('Backspace');
                await wait(400); // Pausa tras limpiar

                await humanType(keyboard, String(safeValue), keyDelayMs);
                
                // Fallback de seguridad (V11.3): Si tras el tipeo virtual el campo sigue vacío (bloqueos de React/validaciones), inyectamos directamente en el DOM
                await page.evaluate(({ xpath, value }) => {
                    const el = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && !el.value) {
                        el.value = value;
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }, { xpath: profile.xpath, value: String(safeValue) }).catch(() => null);

                return { executed: true, action: 'type', description: `Escrito (Humano + Fallback DOM): "${safeValue}"` };
            }

            case WIDGET_TYPES.SEARCH: {
                if (!value) return { executed: false, action: 'skip', description: 'Sin término de búsqueda' };
                await checkPageHealth(page);
                await keyboard.down('Control');
                await keyboard.press('a');
                await keyboard.up('Control');
                await keyboard.press('Backspace');
                await wait(300);
                await humanType(keyboard, String(value), keyDelayMs);
                await wait(400);
                await keyboard.press('Enter');
                return { executed: true, action: 'search', description: `Buscado (Humano): "${value}"` };
            }

            case WIDGET_TYPES.DATE_NATIVE: {
                if (!value) return { executed: false, action: 'skip', description: 'Sin fecha' };
                await cognitivePause('high');
                // value format from Gemini is usually YYYY-MM-DD
                const parts = String(value).split('-');
                if (parts.length === 3) {
                    const [y, m, d] = parts;
                    // Protocolo de Supervivencia: Romper focus trap mediante navegación segmentada
                    await humanType(keyboard, d);
                    await wait(600); // Espera para que el lector anuncie "Tab"
                    await keyboard.press('Tab');
                    await wait(1000); // Escucha de "Mes"
                    await humanType(keyboard, m);
                    await wait(600);
                    await keyboard.press('Tab');
                    await wait(1000); // Escucha de "Año"
                    await humanType(keyboard, y);
                    return { executed: true, action: 'date_segmented', description: `Fecha ingresada por segmentos: ${d}/${m}/${y} (Biological Timing)` };
                }
                // Fallback
                await humanType(keyboard, String(value), keyDelayMs);
                return { executed: true, action: 'date_simple', description: `Fecha establecida: "${value}"` };
            }

            case WIDGET_TYPES.TEXTAREA: {
                if (!value) return { executed: false, action: 'skip', description: 'Sin texto' };
                await keyboard.down('Control');
                await keyboard.press('a');
                await keyboard.up('Control');
                await keyboard.press('Backspace');
                await wait(200);
                await humanType(keyboard, String(value), keyDelayMs);
                return { executed: true, action: 'type', description: `Texto ingresado (Humano, ${String(value).length} chars)` };
            }

            // --- TOGGLES ---
            case WIDGET_TYPES.CHECKBOX:
            case WIDGET_TYPES.SWITCH: {
                await checkPageHealth(page);
                await keyboard.press('Space');
                return { executed: true, action: 'toggle', description: 'Alternado (Space)' };
            }

            // --- RADIO ---
            case WIDGET_TYPES.RADIO: {
                await cognitivePause('low');
                const radioInfo = profile.radioGroupInfo;
                let targetIndex = -1;
                let finalDescription = '';

                if (radioInfo && safeValue !== undefined && safeValue !== null && String(safeValue).trim() !== '') {
                    const searchVal = String(safeValue).trim().toLowerCase();
                    if (radioInfo.options) {
                        targetIndex = radioInfo.options.findIndex(opt => 
                            opt.toLowerCase() === searchVal || opt.toLowerCase().includes(searchVal)
                        );
                    }
                }

                if (targetIndex !== -1 && radioInfo) {
                    const currentIndex = radioInfo.currentIndex !== null ? radioInfo.currentIndex : 0;
                    const delta = targetIndex - currentIndex;
                    console.log(`[widgetDriver RADIO] Mapeado value "${safeValue}" al radio index ${targetIndex} (actual: ${currentIndex}, delta: ${delta})`);
                    
                    if (delta > 0) {
                        for (let i = 0; i < delta; i++) {
                            await checkPageHealth(page);
                            await keyboard.press('ArrowDown');
                            await wait(600);
                        }
                    } else if (delta < 0) {
                        for (let i = 0; i < Math.abs(delta); i++) {
                            await checkPageHealth(page);
                            await keyboard.press('ArrowUp');
                            await wait(600);
                        }
                    }
                    await keyboard.press('Space'); // Asegurar selección del enfocado
                    finalDescription = `Radio seleccionada: "${radioInfo.options[targetIndex]}" (delta ${delta} saltos)`;
                } else {
                    const jumps = (typeof value === 'number' && value > 0) ? value : 1;
                    for (let i = 0; i < jumps; i++) {
                        await checkPageHealth(page);
                        await keyboard.press('ArrowDown');
                        await wait(800);
                    }
                    await keyboard.press('Space');
                    finalDescription = `Radio seleccionada por defecto: ${jumps} posición(es) abajo`;
                }

                // Fallback DOM de seguridad
                if (targetIndex !== -1 && radioInfo) {
                    await page.evaluate(({ name, targetIndex }) => {
                        const radios = Array.from(document.querySelectorAll(`input[type="radio"][name="${name}"]`));
                        const targetRadio = radios[targetIndex];
                        if (targetRadio && !targetRadio.checked) {
                            targetRadio.checked = true;
                            targetRadio.dispatchEvent(new Event('click', { bubbles: true }));
                            targetRadio.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    }, { name: profile.name, targetIndex }).catch(() => null);
                }

                return { executed: true, action: 'radio', description: finalDescription };
            }

            // --- SELECT NATIVO ---
            case WIDGET_TYPES.SELECT_NATIVE: {
                await cognitivePause('high');

                // 1. Abrir dropdown (Alt+ArrowDown es más estándar para accesibilidad en Windows)
                if (!alreadyOpened) {
                    await checkPageHealth(page);
                    await keyboard.down('Alt');
                    await keyboard.press('ArrowDown');
                    await keyboard.up('Alt');
                    await wait(800);
                }

                let targetIndex = -1;
                let finalDescription = '';
                const optionsInfo = profile.selectOptions;

                if (optionsInfo && safeValue !== undefined && safeValue !== null && String(safeValue).trim() !== '') {
                    const searchVal = String(safeValue).trim().toLowerCase();
                    // Buscar coincidencia en las opciones disponibles
                    if (optionsInfo.availableOptions) {
                        targetIndex = optionsInfo.availableOptions.findIndex(opt => 
                            opt.toLowerCase() === searchVal || opt.toLowerCase().includes(searchVal)
                        );
                    }
                }

                if (targetIndex !== -1 && optionsInfo) {
                    const currentIndex = optionsInfo.selectedIndex !== null ? optionsInfo.selectedIndex : 0;
                    const delta = targetIndex - currentIndex;
                    console.log(`[widgetDriver SELECT_NATIVE] Mapeado value "${safeValue}" al index ${targetIndex} (actual: ${currentIndex}, delta: ${delta})`);
                    
                    if (delta > 0) {
                        for (let i = 0; i < delta; i++) {
                            await checkPageHealth(page);
                            await keyboard.press('ArrowDown');
                            await wait(300);
                        }
                    } else if (delta < 0) {
                        for (let i = 0; i < Math.abs(delta); i++) {
                            await checkPageHealth(page);
                            await keyboard.press('ArrowUp');
                            await wait(300);
                        }
                    }
                    finalDescription = `Selección exacta efectuada: "${optionsInfo.availableOptions[targetIndex]}" (delta ${delta} saltos)`;
                } else {
                    // Fallback a exploración aleatoria si no hay coincidencia
                    const jumps = Math.floor(Math.random() * 5) + 1;
                    for (let i = 0; i < jumps; i++) {
                        await checkPageHealth(page);
                        await keyboard.press('ArrowDown');
                        await wait(400);
                    }
                    finalDescription = `Selección aleatoria efectuada (${jumps} saltos de búsqueda)`;
                }

                // 3. Confirmar Selección (Enter) y esperar estabilidad
                await checkPageHealth(page);
                await keyboard.press('Enter');
                await wait(400);

                // Fallback DOM de seguridad: si no cambió el valor o no se seleccionó
                if (targetIndex !== -1) {
                    await page.evaluate(({ xpath, targetIndex }) => {
                        const el = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (el && el.tagName === 'SELECT' && el.selectedIndex !== targetIndex) {
                            el.selectedIndex = targetIndex;
                            el.dispatchEvent(new Event('input', { bubbles: true }));
                            el.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    }, { xpath: profile.xpath, targetIndex }).catch(() => null);
                }

                await wait(1000);
                return { executed: true, action: 'select', description: finalDescription };
            }

            // --- COMBOBOX (autocomplete custom) ---
            case WIDGET_TYPES.COMBOBOX: {
                await cognitivePause('high');
                if (value) {
                    // Limpiar si es un input
                    await page.evaluate(() => {
                        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
                            document.activeElement.value = '';
                        }
                    });
                    await wait(200);
                    await humanType(keyboard, String(value), keyDelayMs);
                    await wait(1500); // Esperar a que aparezcan sugerencias por AJAX (más tiempo para Guaraní)
                } else if (!alreadyOpened) {
                    // Si no hay valor y no se abrió antes, intentar desplegarlo
                    await keyboard.down('Alt');
                    await keyboard.press('ArrowDown');
                    await keyboard.up('Alt');
                    await wait(1000);
                }

                // Navegar a la primera sugerencia
                await checkPageHealth(page);
                await keyboard.press('ArrowDown');
                await wait(600);

                // Confirmación por Enter (asegura selección en widgets custom)
                await checkPageHealth(page);
                await keyboard.press('Enter');
                await wait(800);

                // Avanzar al siguiente campo
                await checkPageHealth(page);
                //await keyboard.press('Tab');
                await wait(1200);

                return { executed: true, action: 'combobox', description: `Combobox seleccionado y confirmado (Enter + Tab)` };
            }

            // --- DATALIST INPUT ---
            case WIDGET_TYPES.DATALIST_INPUT: {
                if (value) {
                    await page.evaluate(() => { document.activeElement.value = ''; });
                    await wait(100);
                    await keyboard.type(String(value), { delay: 70 });
                    await wait(600);
                }
                // ArrowDown para ver opciones del datalist, Enter para confirmar
                await checkPageHealth(page);
                await keyboard.press('ArrowDown');
                await wait(300);
                await keyboard.press('Enter');
                return { executed: true, action: 'datalist', description: `Datalist: filtró con "${value || ''}"` };
            }

            // --- SLIDER ---
            case WIDGET_TYPES.SLIDER: {
                const currentVal = Number(profile.aria?.['aria-valuenow'] || profile.value || 0);
                const targetVal = Number(safeValue);
                const isVertical = profile.aria?.['aria-orientation'] === 'vertical';
                
                let steps = 3;
                let direction = isVertical ? 'ArrowUp' : 'ArrowRight';
                let isRelative = false;

                if (!isNaN(targetVal) && !isNaN(currentVal) && safeValue !== '') {
                    const diff = targetVal - currentVal;
                    steps = Math.abs(diff);
                    direction = diff >= 0 ? (isVertical ? 'ArrowUp' : 'ArrowRight') : (isVertical ? 'ArrowDown' : 'ArrowLeft');
                    isRelative = true;
                } else {
                    const parsedNum = Number(safeValue);
                    if (!isNaN(parsedNum) && safeValue !== '') {
                        steps = Math.abs(parsedNum);
                        direction = parsedNum >= 0 ? (isVertical ? 'ArrowUp' : 'ArrowRight') : (isVertical ? 'ArrowDown' : 'ArrowLeft');
                    }
                }

                for (let i = 0; i < steps; i++) {
                    await checkPageHealth(page);
                    await keyboard.press(direction);
                    await wait(150);
                }

                // Fallback DOM de seguridad
                if (isRelative && !isNaN(targetVal)) {
                    await page.evaluate(({ xpath, targetVal }) => {
                        const el = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (el && el.value !== undefined && Number(el.value) !== targetVal) {
                            el.value = targetVal;
                            el.dispatchEvent(new Event('input', { bubbles: true }));
                            el.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    }, { xpath: profile.xpath, targetVal }).catch(() => null);
                }

                return { 
                    executed: true, 
                    action: 'slider', 
                    description: `Slider movido ${steps} pasos (${direction})` + (isRelative ? ` relativo a valor objetivo ${targetVal}` : '')
                };
            }

            // --- SPINBUTTON ---
            case WIDGET_TYPES.SPINBUTTON: {
                const currentVal = Number(profile.aria?.['aria-valuenow'] || profile.value || 0);
                const targetVal = Number(safeValue);
                
                let steps = 1;
                let dir = 'ArrowUp';
                let isRelative = false;

                if (!isNaN(targetVal) && !isNaN(currentVal) && safeValue !== '') {
                    const diff = targetVal - currentVal;
                    steps = Math.abs(diff);
                    dir = diff >= 0 ? 'ArrowUp' : 'ArrowDown';
                    isRelative = true;
                } else {
                    const parsedNum = Number(safeValue);
                    if (!isNaN(parsedNum) && safeValue !== '') {
                        steps = Math.abs(parsedNum);
                        dir = parsedNum >= 0 ? 'ArrowUp' : 'ArrowDown';
                    }
                }

                for (let i = 0; i < steps; i++) {
                    await checkPageHealth(page);
                    await keyboard.press(dir);
                    await wait(200);
                }

                // Fallback DOM de seguridad
                if (isRelative && !isNaN(targetVal)) {
                    await page.evaluate(({ xpath, targetVal }) => {
                        const el = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                        if (el && el.value !== undefined && Number(el.value) !== targetVal) {
                            el.value = targetVal;
                            el.dispatchEvent(new Event('input', { bubbles: true }));
                            el.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    }, { xpath: profile.xpath, targetVal }).catch(() => null);
                }

                return { 
                    executed: true, 
                    action: 'spinbutton', 
                    description: `Spinbutton: ${steps}× ${dir}` + (isRelative ? ` relativo a valor objetivo ${targetVal}` : '')
                };
            }

            // --- ACTIVACIÓN (botones, links, menuitems) ---
            case WIDGET_TYPES.BUTTON:
            case WIDGET_TYPES.SUBMIT: {
                await checkPageHealth(page);
                
                // Guardar estado inicial para evaluar cambio tras Enter
                const activeXPathBefore = await page.evaluate(() => {
                    const el = document.activeElement;
                    if (!el) return null;
                    return el.id || el.tagName + el.innerText.substring(0, 15);
                }).catch(() => null);

                await keyboard.press('Enter');
                await wait(600);

                // Verificar si el foco cambió o si hubo cambios
                const activeXPathAfter = await page.evaluate(() => {
                    const el = document.activeElement;
                    if (!el) return null;
                    return el.id || el.tagName + el.innerText.substring(0, 15);
                }).catch(() => null);

                // Si el foco no cambió y seguimos en el botón, reintentar con Space por seguridad
                if (activeXPathBefore === activeXPathAfter) {
                    console.log("[widgetDriver BUTTON] Enter no produjo cambio de foco. Intentando Space como fallback...");
                    await checkPageHealth(page);
                    await keyboard.press('Space');
                    await wait(600);
                    return { executed: true, action: 'activate_space', description: 'Botón activado (Enter -> Space Fallback)' };
                }

                return { executed: true, action: 'activate', description: 'Botón activado (Enter)' };
            }

            case WIDGET_TYPES.LINK: {
                await keyboard.press('Enter');
                return { executed: true, action: 'navigate', description: 'Enlace activado (Enter)' };
            }

            case WIDGET_TYPES.MENUITEM: {
                await keyboard.press('Enter');
                return { executed: true, action: 'menu', description: 'Ítem de menú activado (Enter)' };
            }

            // --- TAB (pestaña en tablist) ---
            case WIDGET_TYPES.TAB: {
                const direction = (typeof value === 'number' && value < 0) ? 'ArrowLeft' : 'ArrowRight';
                const steps = (typeof value === 'number') ? Math.abs(value) : 1;
                for (let i = 0; i < steps; i++) {
                    await keyboard.press(direction);
                    await wait(300);
                }
                return { executed: true, action: 'tab_switch', description: `Pestaña: ${steps}× ${direction}` };
            }

            // --- GRIDCELL (Celdas de calendario/malla) ---
            case WIDGET_TYPES.GRIDCELL: {
                await cognitivePause('low');
                await checkPageHealth(page);
                
                // En un calendario o malla, activar la celda (el día) se hace con Enter
                await keyboard.press('Enter');
                await wait(800);
                
                return { 
                    executed: true, 
                    action: 'gridcell_activate', 
                    description: `Celda de cuadrícula activada con Enter: "${profile.label || 'celda'}"` 
                };
            }

            // --- FALLBACK ---
            case WIDGET_TYPES.UNKNOWN:
            default: {
                return { executed: false, action: 'unknown', description: `Widget no reconocido (${profile.tag}/${profile.role || 'sin role'})` };
            }
        }
    } catch (e) {
        const isSessionClosed =
            e.message.includes('Session closed') ||
            e.message.includes('Target closed') ||
            e.message.includes('page has been closed') ||
            e.message.includes('detached Frame') ||
            e.message.includes('Execution context was destroyed');

        if (isSessionClosed) {
            // Error esperado cuando la página se cierra durante la interacción — no propagar
            return { executed: false, action: 'session_closed', description: 'El navegador o la página se cerró durante la interacción.' };
        }

        console.error('Widget Interaction Error (inesperado):', e.message);
        throw e;
    }
}

/**
 * Obtiene el nombre humano del tipo de widget.
 * @param {string} widgetType
 * @returns {string}
 */
export function getWidgetLabel(widgetType) {
    return WIDGET_LABELS[widgetType] || 'Desconocido';
}

export { WIDGET_TYPES };

/**
 * Forward-Only Escape Hatch
 * Busca el siguiente elemento interactivo en el DOM (en orden de profundidad) que NO esté
 * en la lista de elementos ya interactuados, ignorando el orden defectuoso del tabindex.
 * @param {import('puppeteer').Page} page
 * @param {Array<string>} interactedElementsArray
 * @returns {Promise<boolean>} true si logró evadir, false si no hay más elementos.
 */
export async function forceAdvanceToNextNewElement(page, interactedElementsArray) {
    try {
        return await page.evaluate((interactedIds) => {
            // Helper para calcular un XPath básico como fallback si no hay ID
            function getBasicXPath(element) {
                if (element.id) return '//*[@id="' + element.id + '"]';
                if (element === document.body) return '/html/body';
                let ix = 0;
                let siblings = element.parentNode.childNodes;
                for (let i = 0; i < siblings.length; i++) {
                    let sibling = siblings[i];
                    if (sibling === element) return getBasicXPath(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + (ix + 1) + ']';
                    if (sibling.nodeType === 1 && sibling.tagName === element.tagName) ix++;
                }
            }

            // Seleccionar todos los elementos potencialmente interactivos
            const interactables = Array.from(document.querySelectorAll(
                'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
            ));

            // Filtrar elementos invisibles (display:none, visibility:hidden, height=0)
            const visibles = interactables.filter(el => {
                const rect = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);
                return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
            });

            const current = document.activeElement;
            let startIndex = visibles.indexOf(current);
            if (startIndex === -1) startIndex = 0;

            // Iterar hacia adelante en orden de DOM
            for (let i = startIndex + 1; i < visibles.length; i++) {
                const candidate = visibles[i];
                const candidateId = candidate.id || getBasicXPath(candidate);
                
                if (!interactedIds.includes(candidateId)) {
                    // Encontramos un elemento NUEVO!
                    candidate.focus();
                    return true;
                }
            }
            
            return false; // No hay elementos nuevos hacia adelante
        }, interactedElementsArray);
    } catch (e) {
        return false;
    }
}
