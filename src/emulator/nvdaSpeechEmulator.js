/**
 * NVDASpeechEmulator - Emulador de Síntesis de Voz NVDA en Español (Event-Driven / Reactivo)
 * 
 * Responsabilidad: Inyectar listeners de foco, tipeo y regiones dinámicas (aria-live)
 * en el contexto del navegador, traduciendo eventos a la verbalización oficial de NVDA.
 */

export const NVDASpeechEmulatorCode = `
window.NVDASpeechEmulator = {
    activeContainers: [],
    lastCell: null,
    lastList: null,
    lastInputValue: '',
    observer: null,
    liveRegionQueue: new Map(),
    liveRegionTimeout: null,

    getContainerName: function(el) {
        let name = '';
        if (el.getAttribute('aria-label')) {
            name = el.getAttribute('aria-label');
        } else if (el.getAttribute('aria-labelledby')) {
            const labels = el.getAttribute('aria-labelledby').split(/\\s+/).map(id => document.getElementById(id)).filter(Boolean);
            name = labels.map(l => l.innerText).join(' ');
        } else if (el.tagName.toLowerCase() === 'fieldset') {
            const legend = el.querySelector('legend');
            if (legend) name = legend.innerText;
        } else if (el.tagName.toLowerCase() === 'table') {
            const caption = el.querySelector('caption');
            if (caption) name = caption.innerText;
        } else if (el.getAttribute('title')) {
            name = el.getAttribute('title');
        }
        return (name || '').trim();
    },

    getContainers: function(el) {
        let containers = [];
        let cur = el.parentElement;
        while (cur && cur !== document.body && cur !== document.documentElement) {
            const tagName = cur.tagName.toLowerCase();
            const role = (cur.getAttribute('role') || '').toLowerCase();
            
            let isContainer = false;
            let containerRole = '';
            let containerName = '';

            if (tagName === 'dialog' || role === 'dialog') {
                isContainer = true;
                containerRole = 'cuadro de diálogo';
            } else if (role === 'alertdialog') {
                isContainer = true;
                containerRole = 'cuadro de diálogo de alerta';
            } else if (tagName === 'table' || role === 'table' || role === 'grid') {
                isContainer = true;
                const rows = cur.rows ? cur.rows.length : cur.querySelectorAll('tr, [role="row"]').length;
                const cols = cur.rows && cur.rows[0] ? cur.rows[0].cells.length : (cur.querySelector('tr, [role="row"]')?.querySelectorAll('td, th, [role="gridcell"], [role="columnheader"]').length || 0);
                containerRole = \`tabla con \${rows} filas y \${cols} columnas\`;
            } else if (tagName === 'ul' || tagName === 'ol' || role === 'list' || role === 'listbox') {
                isContainer = true;
                const items = Array.from(cur.children).filter(c => c.tagName === 'LI' || c.getAttribute('role') === 'listitem' || c.getAttribute('role') === 'option').length;
                containerRole = \`lista con \${items} elementos\`;
            } else if (tagName === 'form' || role === 'form') {
                isContainer = true;
                containerRole = 'formulario';
            } else if (tagName === 'fieldset' || role === 'group') {
                isContainer = true;
                containerRole = 'agrupación';
            } else if (tagName === 'main' || role === 'main') {
                isContainer = true;
                containerRole = 'principal región';
            } else if (tagName === 'nav' || role === 'navigation') {
                isContainer = true;
                containerRole = 'navegación región';
            } else if (tagName === 'header' || role === 'banner') {
                isContainer = true;
                containerRole = 'banner región';
            } else if (tagName === 'footer' || role === 'contentinfo') {
                isContainer = true;
                containerRole = 'información de contacto región';
            } else if (tagName === 'aside' || role === 'complementary') {
                isContainer = true;
                containerRole = 'complementario región';
            } else if (role === 'search') {
                isContainer = true;
                containerRole = 'búsqueda región';
            } else if (tagName === 'section' || role === 'region') {
                containerName = this.getContainerName(cur);
                if (containerName) {
                    isContainer = true;
                    containerRole = 'región';
                }
            }

            if (isContainer) {
                if (!containerName) {
                    containerName = this.getContainerName(cur);
                }
                
                let speechParts = [];
                if (containerName) speechParts.push(containerName);
                if (containerRole) speechParts.push(containerRole);
                
                containers.unshift({
                    element: cur,
                    speech: speechParts.join(' ')
                });
            }

            cur = cur.parentElement;
        }
        return containers;
    },

    announce: function(el) {
        if (!el || el === document.body || el.tagName === 'BODY' || el.tagName === 'HTML') return '';
        if (el.getAttribute('data-fisgon-ignore') === 'true' || el.getAttribute('aria-hidden') === 'true') return '';

        // Ignorar imágenes decorativas
        if (el.tagName.toLowerCase() === 'img' && el.getAttribute('alt') === '') return '';

        let speech = [];

        // 1. Detección y rastreo de contenedores ancestros
        const currentContainers = this.getContainers(el);
        const previousContainers = this.activeContainers || [];

        let commonCount = 0;
        const maxCheck = Math.min(currentContainers.length, previousContainers.length);
        for (let i = 0; i < maxCheck; i++) {
            if (currentContainers[i].element === previousContainers[i].element) {
                commonCount++;
            } else {
                break;
            }
        }

        for (let i = commonCount; i < currentContainers.length; i++) {
            if (currentContainers[i].speech) {
                speech.push(currentContainers[i].speech);
            }
        }

        this.activeContainers = currentContainers;

        // 2. Coordinación de Celdas de Tabla
        const cell = el.closest('td, th');
        if (cell) {
            const table = cell.closest('table') || cell.closest('[role="table"], [role="grid"]');
            if (table) {
                const tr = cell.closest('tr') || cell.closest('[role="row"]');
                
                let rowIndex = 0;
                let colIndex = 0;
                
                if (cell.tagName.toLowerCase() === 'td' || cell.tagName.toLowerCase() === 'th') {
                    rowIndex = tr ? tr.rowIndex + 1 : 0;
                    colIndex = cell.cellIndex + 1;
                } else {
                    const rows = Array.from(table.querySelectorAll('[role="row"]'));
                    rowIndex = tr ? rows.indexOf(tr) + 1 : 0;
                    const cells = tr ? Array.from(tr.querySelectorAll('[role="gridcell"], [role="columnheader"], [role="rowheader"]')) : [];
                    colIndex = cells.indexOf(cell) + 1;
                }

                if (!this.lastCell || this.lastCell.table !== table || this.lastCell.row !== rowIndex || this.lastCell.col !== colIndex) {
                    let coordinateSpeech = [];
                    const rowChanged = !this.lastCell || this.lastCell.table !== table || this.lastCell.row !== rowIndex;
                    const colChanged = !this.lastCell || this.lastCell.table !== table || this.lastCell.col !== colIndex;

                    if (rowChanged) {
                        const rowHeaderEl = tr ? (tr.querySelector('th, [role="rowheader"]') || tr.cells?.[0]) : null;
                        const rowHeader = (rowHeaderEl && rowHeaderEl !== cell) ? rowHeaderEl.innerText.trim() : '';
                        coordinateSpeech.push(\`fila \${rowIndex}\${rowHeader ? ' ' + rowHeader : ''}\`);
                    }
                    if (colChanged) {
                        let colHeader = '';
                        if (table.rows) {
                            const firstRow = table.rows[0];
                            const colHeaderEl = firstRow ? firstRow.cells[cell.cellIndex] : null;
                            colHeader = (colHeaderEl && colHeaderEl !== cell) ? colHeaderEl.innerText.trim() : '';
                        } else {
                            const firstRow = table.querySelector('[role="row"]');
                            const colHeaderEl = firstRow ? firstRow.querySelectorAll('[role="columnheader"], [role="gridcell"]')[colIndex - 1] : null;
                            colHeader = (colHeaderEl && colHeaderEl !== cell) ? colHeaderEl.innerText.trim() : '';
                        }
                        coordinateSpeech.push(\`columna \${colIndex}\${colHeader ? ' ' + colHeader : ''}\`);
                    }

                    if (coordinateSpeech.length > 0) {
                        speech.push(coordinateSpeech.join(' '));
                    }

                    this.lastCell = { table, row: rowIndex, col: colIndex };
                }
            }
        } else {
            this.lastCell = null;
        }

        // 3. Posiciones de Elementos de Lista
        const listItem = el.closest('li') || (el.getAttribute('role') === 'listitem' ? el : null);
        if (listItem) {
            const list = listItem.closest('ul, ol') || listItem.parentElement;
            if (list && (list.tagName === 'UL' || list.tagName === 'OL' || list.getAttribute('role') === 'list')) {
                const listItems = Array.from(list.children).filter(c => c.tagName === 'LI' || c.getAttribute('role') === 'listitem');
                const index = listItems.indexOf(listItem) + 1;
                const total = listItems.length;
                
                if (!this.lastList || this.lastList.list !== list || this.lastList.index !== index) {
                    speech.push(\`\${index} de \${total}\`);
                    this.lastList = { list, index };
                }
            }
        } else {
            this.lastList = null;
        }

        // 4. Cómputo de Atributos del Elemento
        const tagName = el.tagName.toLowerCase();
        const role = (el.getAttribute('role') || '').toLowerCase();
        const type = (el.type || el.getAttribute('type') || '').toLowerCase();

        let name = '';
        if (el.getAttribute('aria-label')) {
            name = el.getAttribute('aria-label');
        } else if (el.getAttribute('aria-labelledby')) {
            const labels = el.getAttribute('aria-labelledby').split(/\\s+/).map(id => document.getElementById(id)).filter(Boolean);
            name = labels.map(l => l.innerText).join(' ');
        } else if (el.labels && el.labels.length > 0) {
            name = el.labels[0].innerText;
        } else if (el.getAttribute('placeholder')) {
            name = el.getAttribute('placeholder');
        } else if (el.getAttribute('title')) {
            name = el.getAttribute('title');
        } else if (tagName === 'img' || tagName === 'svg' || role === 'img') {
            name = el.getAttribute('alt') || '';
        } else {
            const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select';
            if (!isInput) {
                name = el.innerText || '';
            }
        }
        name = (name || '').trim();

        if (name.length > 80) {
            name = name.substring(0, 80) + '...';
        }

        let speakRole = '';
        let speakStates = [];
        let speakValue = '';

        const isRequired = el.required || el.getAttribute('aria-required') === 'true';
        const isDisabled = el.disabled || el.getAttribute('aria-disabled') === 'true';
        const isInvalid = el.getAttribute('aria-invalid') === 'true';
        const hasPopup = el.getAttribute('aria-haspopup');
        const isReadOnly = el.readOnly || el.getAttribute('aria-readonly') === 'true';

        if (tagName === 'a' || role === 'link') {
            const isVisited = el.visited || el.classList.contains('visited');
            speakRole = isVisited ? 'enlace visitado' : 'enlace';
        } 
        else if (tagName === 'button' || role === 'button' || type === 'button' || type === 'submit') {
            if (el.getAttribute('aria-pressed') !== null) {
                speakRole = 'botón alternable';
                const isPressed = el.getAttribute('aria-pressed') === 'true';
                speakStates.push(isPressed ? 'presionado' : 'no presionado');
            } else {
                speakRole = 'botón';
            }
        } 
        else if (type === 'checkbox' || role === 'checkbox') {
            speakRole = 'casilla de verificación';
            const isChecked = el.checked || el.getAttribute('aria-checked') === 'true';
            const isIndeterminate = el.indeterminate || el.getAttribute('aria-checked') === 'mixed';
            speakStates.push(isIndeterminate ? 'indeterminado' : (isChecked ? 'marcado' : 'no marcado'));
        } 
        else if (type === 'radio' || role === 'radio') {
            speakRole = 'botón de opción';
            const isChecked = el.checked || el.getAttribute('aria-checked') === 'true';
            speakStates.push(isChecked ? 'marcado' : 'no marcado');
            
            if (el.name) {
                const form = el.closest('form') || document;
                const radios = Array.from(form.querySelectorAll(\`input[type="radio"][name="\${el.name}"]\`));
                if (radios.length > 0) {
                    const idx = radios.indexOf(el) + 1;
                    speakStates.push(\`\${idx} de \${radios.length}\`);
                }
            }
        } 
        else if (tagName === 'textarea' || (tagName === 'input' && (type === 'text' || type === 'email' || type === 'password' || type === 'tel' || type === 'number' || type === 'url' || type === 'search')) || role === 'textbox') {
            const isMultiline = tagName === 'textarea' || el.getAttribute('aria-multiline') === 'true';
            
            if (type === 'password') {
                speakRole = 'cuadro de edición protegido';
                speakValue = el.value ? '••••••••' : 'vacío';
            } else if (type === 'email') {
                speakRole = 'cuadro de edición correo electrónico';
                speakValue = el.value || 'vacío';
            } else if (type === 'number') {
                speakRole = 'cuadro de edición numérico';
                speakValue = el.value || 'vacío';
            } else if (type === 'tel') {
                speakRole = 'cuadro de edición teléfono';
                speakValue = el.value || 'vacío';
            } else if (type === 'url') {
                speakRole = 'cuadro de edición dirección web';
                speakValue = el.value || 'vacío';
            } else if (type === 'search') {
                speakRole = 'cuadro de búsqueda';
                speakValue = el.value || 'vacío';
            } else {
                speakRole = isMultiline ? 'cuadro de edición multilínea' : 'cuadro de edición';
                speakValue = el.value || 'vacío';
            }

            if (isRequired) speakStates.push('requerido');
            if (isReadOnly) speakStates.push('sólo lectura');
            if (el.getAttribute('aria-autocomplete') || hasPopup === 'listbox') {
                speakStates.push('con autocompletar');
            }
        } 
        else if (tagName === 'select' || role === 'combobox') {
            speakRole = 'cuadro combinado';
            const isExpanded = el.getAttribute('aria-expanded') === 'true';
            speakStates.push(isExpanded ? 'expandido' : 'contraído');
            
            if (tagName === 'select') {
                speakValue = el.options[el.selectedIndex]?.text || '';
            } else {
                speakValue = el.value || '';
            }
        } 
        else if (role === 'option') {
            const isSelected = el.getAttribute('aria-selected') === 'true';
            if (isSelected) speakStates.push('seleccionado');
            
            const listbox = el.closest('[role="listbox"]');
            if (listbox) {
                const options = Array.from(listbox.querySelectorAll('[role="option"]'));
                const idx = options.indexOf(el) + 1;
                speakStates.push(\`\${idx} de \${options.length}\`);
            }
        }
        else if (role === 'tab') {
            speakRole = 'pestaña';
            const isSelected = el.getAttribute('aria-selected') === 'true';
            if (isSelected) speakStates.push('seleccionado');
            
            const tablist = el.closest('[role="tablist"]');
            if (tablist) {
                const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
                const idx = tabs.indexOf(el) + 1;
                speakStates.push(\`\${idx} de \${tabs.length}\`);
            }
        } 
        else if (tagName.match(/^h[1-6]$/) || role === 'heading') {
            const level = el.getAttribute('aria-level') || tagName.substring(1) || '1';
            speakRole = \`encabezado nivel \${level}\`;
        } 
        else if (tagName === 'img' || role === 'img' || tagName === 'svg') {
            speakRole = 'gráfico';
        } 
        else if (role === 'alert') {
            speakRole = 'alerta';
        }

        if (isDisabled) speakStates.push('no disponible');
        if (isInvalid) speakStates.push('entrada inválida');

        // Construcción de la frase en el orden de NVDA
        let itemSpeech = [];
        
        if (name) itemSpeech.push(name);
        if (speakRole) itemSpeech.push(speakRole);
        
        if (speakStates.length > 0) {
            itemSpeech.push(speakStates.join(' '));
        }

        if (speakValue) {
            itemSpeech.push(speakValue);
        }

        const descId = el.getAttribute('aria-describedby');
        if (descId) {
            const descEl = document.getElementById(descId);
            if (descEl) {
                itemSpeech.push(descEl.innerText.trim());
            }
        }

        speech.push(itemSpeech.join(' '));
        return speech.filter(s => s !== '').join('. ');
    },

    speakElement: function(el) {
        if (!el) return;
        if (this.lastFocusedElement === el) return;
        this.lastFocusedElement = el;
        this.lastSelectedText = ''; // Reiniciar selección de combo anterior

        const text = this.announce(el);
        if (text) {
            this.speakText(text, true); // Cambios de foco cancelan la cola previa
        }
        
        // Registrar valor inicial para el diff del tipeo reactivo
        const isEditable = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
        if (isEditable) {
            this.lastInputValue = el.value || el.innerText || '';
        }
    },

    speakText: function(text, cancelPrevious) {
        if (!text || !text.trim()) return;
        
        // Propagar al backend de Node en primer lugar
        if (window.onFisgonSpeech) {
            window.onFisgonSpeech(text, cancelPrevious);
            return;
        }

        // Sintetizar usando la Web Speech API (fallback)
        if (window.speechSynthesis) {
            if (cancelPrevious) {
                window.speechSynthesis.cancel();
            }
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'es-ES';
            utterance.rate = 1.1;
            window.speechSynthesis.speak(utterance);
        }
    },

    // 1. Capturar cambios de Foco
    initFocusListener: function() {
        document.addEventListener('focusin', (event) => {
            const el = event.target;
            if (el === document.body || el === document.documentElement) {
                this.lastFocusedElement = null;
                return;
            }
            this.speakElement(el);
        }, true);
    },

    // 2. Detección en tiempo real de Tipeo (Keyboard Diff)
    initInputListener: function() {
        document.addEventListener('input', (event) => {
            const el = event.target;
            if (el !== document.activeElement) return;

            const isEditable = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
            if (!isEditable) return;

            if (el.type === 'password') {
                const oldLen = this.lastInputValue ? this.lastInputValue.length : 0;
                const newLen = el.value ? el.value.length : 0;
                if (newLen > oldLen) {
                    this.speakText('asterisco', false);
                } else if (newLen < oldLen) {
                    this.speakText('borrado', false);
                }
                this.lastInputValue = el.value || '';
                return;
            }

            const oldVal = this.lastInputValue || '';
            const newVal = el.value || el.innerText || '';
            this.lastInputValue = newVal;

            if (newVal === oldVal) return;

            // Encontrar prefijo común
            let i = 0;
            while (i < oldVal.length && i < newVal.length && oldVal[i] === newVal[i]) {
                i++;
            }

            // Encontrar sufijo común
            let j = 0;
            while (j < (oldVal.length - i) && j < (newVal.length - i) && oldVal[oldVal.length - 1 - j] === newVal[newVal.length - 1 - j]) {
                j++;
            }

            const added = newVal.substring(i, newVal.length - j);
            const removed = oldVal.substring(i, oldVal.length - j);

            if (added) {
                this.speakText(added, false); // No interrumpir lo que se está hablando si el usuario escribe rápido
            } else if (removed) {
                // NVDA habla la letra borrada al presionar Backspace
                this.speakText(removed, false);
            }
        }, true);
    },

    // 3. Captura de Regiones Dinámicas (aria-live) con Coalescencia (micro-debounce)
    queueLiveAnnouncement: function(liveEl, text, isAssertive) {
        if (!text || !text.trim()) return;
        const key = liveEl;
        if (!this.liveRegionQueue.has(key)) {
            this.liveRegionQueue.set(key, { text: '', assertive: isAssertive });
        }
        const data = this.liveRegionQueue.get(key);
        if (!data.text.includes(text)) {
            data.text = data.text ? data.text + ' ' + text : text;
        }
        data.assertive = data.assertive || isAssertive;

        if (this.liveRegionTimeout) clearTimeout(this.liveRegionTimeout);
        this.liveRegionTimeout = setTimeout(() => {
            this.processLiveQueue();
        }, 50);
    },

    processLiveQueue: function() {
        this.liveRegionQueue.forEach((data) => {
            if (data.text.trim()) {
                this.speakText(data.text.trim(), data.assertive);
            }
        });
        this.liveRegionQueue.clear();
        this.liveRegionTimeout = null;
    },

    initObserver: function() {
        if (this.observer) return;
        
        this.observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                let targetNode = mutation.target;
                
                // Capturar cambios en aria-activedescendant para combos ARIA
                if (mutation.type === 'attributes' && mutation.attributeName === 'aria-activedescendant') {
                    const descendantId = targetNode.getAttribute('aria-activedescendant');
                    if (descendantId) {
                        const descendantEl = document.getElementById(descendantId);
                        if (descendantEl) {
                            const text = this.announce(descendantEl);
                            if (text) {
                                this.speakText(text, true); // Interrumpe selección previa
                            }
                        }
                    }
                    return;
                }

                const searchNode = targetNode.nodeType === Node.ELEMENT_NODE ? targetNode : targetNode.parentElement;
                if (!searchNode) return;
                
                const liveEl = searchNode.closest('[aria-live]');
                if (!liveEl) return;
                
                const liveValue = (liveEl.getAttribute('aria-live') || '').toLowerCase();
                if (liveValue === 'off' || !liveValue) return;

                const isAssertive = liveValue === 'assertive';
                let newText = '';

                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.TEXT_NODE) {
                            newText += node.textContent;
                        } else if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.getAttribute('aria-hidden') !== 'true' && node.getAttribute('data-fisgon-ignore') !== 'true') {
                                newText += ' ' + node.innerText;
                            }
                        }
                    });
                } else if (mutation.type === 'characterData') {
                    newText = mutation.target.textContent;
                }

                newText = newText.trim();
                if (newText) {
                    this.queueLiveAnnouncement(liveEl, newText, isAssertive);
                }
            });
        });

        const startObserve = () => {
            const target = document.body || document.documentElement;
            if (target) {
                this.observer.observe(target, {
                    childList: true,
                    characterData: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['aria-activedescendant']
                });
            }
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startObserve);
        } else {
            startObserve();
        }
    },

    // 4. Capturar selección en native <select> (Combos con flechas/cambios)
    handleSelectChange: function(el) {
        if (el.tagName.toLowerCase() === 'select') {
            const selectedText = el.options[el.selectedIndex]?.text || '';
            if (selectedText && this.lastSelectedText !== selectedText) {
                this.lastSelectedText = selectedText;
                this.speakText(selectedText, true);
            }
        }
    },

    initSelectListener: function() {
        const handler = (event) => {
            if (event.target.tagName.toLowerCase() === 'select') {
                this.handleSelectChange(event.target);
            }
        };
        document.addEventListener('change', handler, true);
        document.addEventListener('input', handler, true);
    },

    init: function() {
        this.initFocusListener();
        this.initInputListener();
        this.initSelectListener();
        this.initObserver();
        
        // Si el DOM ya está cargado, registrar el foco del elemento activo actual
        if (document.activeElement && document.activeElement !== document.body) {
            this.speakElement(document.activeElement);
        }
    }
};

window.NVDASpeechEmulator.init();
`;
