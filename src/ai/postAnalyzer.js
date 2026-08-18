import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { supabase } from './helpers/supabase.js';
import { analyzeA11ySmell } from './helpers/askBrain.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno del archivo .env local
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const AEVENT_METADATA = {
    'Missing SR Text': {
        detection: "Se detecta cuando un elemento interactivo (botón, enlace) no cuenta con texto accesible para lectores de pantalla (falta aria-label, aria-labelledby o contenido de texto).",
        considered: "Ausencia de contenido textual y atributos de descripción accesible.",
        saved: "Selector CSS, código HTML del elemento, captura de pantalla, secuencia de focos previos."
    },
    'Unhelpful Label': {
        detection: "Se detecta cuando un campo de entrada (input, select, textarea) no tiene una etiqueta vinculada (<label>) o su texto descriptivo es genérico/vacío.",
        considered: "Falta de asociación de etiquetas e identificadores accesibles.",
        saved: "Selector CSS, código HTML del elemento, captura de pantalla, speech output."
    },
    'Winding Tab Sequence': {
        detection: "Se detecta cuando la navegación secuencial con Tabulador realiza saltos no lineales en el orden visual de la página (ej: foco salta de abajo hacia arriba de forma brusca).",
        considered: "Coordenadas Y del foco anterior vs foco actual y validación de orden flex-direction reverse, portals o CSS order.",
        saved: "Selector de origen/destino, coordenadas del salto (px), HTML circundante (Parent y Form Context), captura con trazado de foco de los últimos 4 elementos, speech output."
    },
    'Skipped Focus Element': {
        detection: "Se detecta cuando la navegación por tabulación salta elementos interactivos visibles en el orden de pantalla sin enfocarlos.",
        considered: "Lista de elementos interactivos visibles ordenados por coordenadas espaciales vs el foco real actual. Excluye grupos de botones de radio ya visitados/activos.",
        saved: "Selector del elemento omitido, origen y destino, captura de pantalla con recuadro rojo punteado sobre el elemento saltado, secuencia de focos."
    },
    'Frequent Tab': {
        detection: "Se detecta cuando el foco queda atrapado o se repite en bucle sobre un conjunto reducido de elementos (Bucle de Tabulación o Tab Trap).",
        considered: "Repetición secuencial en el historial de foco.",
        saved: "Historial de focos repetidos, selector CSS, captura de pantalla."
    },
    'Misleading Speech Synthesis': {
        detection: "Se detecta cuando el lector de pantalla lee un texto o etiqueta que no coincide visualmente con lo que se muestra en pantalla (Confusión Cognitiva).",
        considered: "Diferencia semántica entre el texto visible del elemento y su etiqueta aria-label o aria-labelledby.",
        saved: "Texto visual, texto verbalizado por el lector, selector CSS, captura de pantalla."
    },
    'Modal Window Display': {
        detection: "Se detecta cuando se despliega un diálogo emergente (modal) pero no se gestiona el foco (no se envía el foco al modal y el usuario puede seguir tabulando de fondo).",
        considered: "Aparición de capas visuales sobrepuestas sin atributo aria-modal o retención de foco.",
        saved: "Selector del modal, HTML del contenedor, captura de pantalla."
    },
    'Deleted Input Content': {
        detection: "Se detecta cuando el contenido de un formulario se borra o limpia inesperadamente sin notificar verbalmente al usuario.",
        considered: "Evento de borrado o reset de valores en inputs sin cambios en el lector de pantalla.",
        saved: "Selector del input, valor anterior, captura de pantalla con overlay del elemento afectado."
    },
    'Content Removed Without Notice': {
        detection: "Se detecta cuando partes del contenido de la interfaz desaparecen del DOM de forma dinámica sin usar live regions (aria-live) para avisar al usuario de lector de pantalla.",
        considered: "Remoción o desvanecimiento de nodos del DOM sin atributos aria-live.",
        saved: "HTML del contenedor de origen, selector del elemento removido, captura de pantalla."
    },
    'Re enter focus form': {
        detection: "Se detecta cuando el foco abandona un formulario y vuelve a entrar a él repetidamente, indicando posible desorientación.",
        considered: "Historial de reingresos secuenciales al mismo contenedor de formulario.",
        saved: "Selectores de reingreso, captura de pantalla, speech output."
    },
    'Re enter focus page': {
        detection: "Se detecta cuando el foco sale de la zona de interacción principal y retorna al inicio de la página repetidas veces de forma cíclica.",
        considered: "Historial de saltos hacia el inicio del documento.",
        saved: "Selectores, coordenadas de salto, captura de pantalla."
    },
    'Form Submission Accessibility': {
        detection: "Se detecta cuando se envía un formulario pero ocurren errores de validación que no son leídos por el lector de pantalla o el foco no se mueve al error.",
        considered: "Evento submit con validación errónea silenciada.",
        saved: "HTML del formulario, elementos de error, captura de pantalla."
    },
    'Page Exit Attempt': {
        detection: "Se detecta cuando el foco abandona por completo la página activa de forma prematura durante la simulación de llenado.",
        considered: "Salida del documento activo hacia barras de herramientas del navegador.",
        saved: "Último elemento enfocado, captura de pantalla."
    }
};

function getAEventMetadata(type) {
    return AEVENT_METADATA[type] || {
        detection: "Detección automática por sensores del simulador basado en heurísticas de navegación por teclado.",
        considered: "Foco activo, interacción del teclado, y mutaciones en el DOM.",
        saved: "Selector CSS, captura de pantalla, traza del foco, speech output del lector de pantalla."
    };
}

const aiConfig = {
    provider: process.env.AI_PROVIDER || 'ollama',
    ollamaHost: process.env.OLLAMA_HOST || 'http://127.0.0.1:11434',
    ollamaModel: process.env.OLLAMA_MODEL || 'llama3.2-vision:latest',
    aiApiKey: process.env.AI_API_KEY
};

async function runPostAnalysis() {
    const args = process.argv.slice(2);
    let sessionId = null;
    for (const arg of args) {
        if (arg.startsWith('--sessionId=')) {
            sessionId = arg.split('=')[1];
        }
    }

    if (!sessionId) {
        console.error("❌ Error: Se requiere especificar --sessionId=<UUID_SESION>");
        process.exit(1);
    }

    console.log(`\n============================================================`);
    console.log(`🧠 INICIANDO AUDITORÍA FORENSE POST-SIMULACIÓN (CEREBRO)`);
    console.log(`🎯 ID de Sesión: ${sessionId}`);
    console.log(`🤖 Proveedor de IA: ${aiConfig.provider.toUpperCase()} (${aiConfig.ollamaModel})`);
    console.log(`============================================================\n`);

    // Obtener datos del lote (batch_id) de la sesión
    let batchId = 'default_batch';
    try {
        const { data: sessionRow } = await supabase
            .from('sessions')
            .select('notes, url')
            .eq('id', sessionId)
            .maybeSingle();
        if (sessionRow && sessionRow.notes && sessionRow.notes.startsWith('batch_id:')) {
            batchId = sessionRow.notes.split(':')[1];
        }
    } catch (err) {
        console.warn("⚠️ Advertencia al obtener el lote (batch_id) de la sesión:", err.message);
    }

    // Obtener las acciones del simulador (audit_steps)
    let actionSteps = [];
    try {
        const { data: steps } = await supabase
            .from('audit_steps')
            .select('*')
            .eq('session_id', sessionId)
            .order('timestamp', { ascending: true });
        if (steps) {
            actionSteps = steps;
        }
    } catch (err) {
        console.warn("⚠️ Advertencia al obtener las acciones del simulador (audit_steps):", err.message);
    }

    // 1. Obtener todos los issues registrados para esta sesión
    const { data: issues, error: fetchError } = await supabase
        .from('a11y_issues')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });

    if (fetchError) {
        console.error("❌ Error al obtener issues de Supabase:", fetchError.message);
        process.exit(1);
    }

    if (!issues || issues.length === 0) {
        console.log("ℹ️ No se detectaron AEvents en esta sesión. Nada que analizar.");
        process.exit(0);
    }

    console.log(`📋 Total de AEvents brutos detectados: ${issues.length}`);

    // 2. Proceso de Deduplicación Estructural e Inteligente
    // Ordenamos por longitud de selector para procesar primero los ancestros/contenedores (ej: <a> antes que <img>)
    issues.sort((a, b) => (a.selector || '').length - (b.selector || '').length);

    const uniqueIssues = [];
    const duplicatesToDelete = [];

    for (const issue of issues) {
        let isDuplicate = false;
        const selector = issue.selector || 'N/A';

        for (const unique of uniqueIssues) {
            // Caso A: Mismo tipo y mismo selector exacto
            if (issue.type === unique.type && selector === unique.selector) {
                isDuplicate = true;
                break;
            }
            
            // Caso B: Solapamiento estructural (ej: a > img, button > span)
            // Si el selector de este issue es hijo o descendiente del selector único que ya registramos
            if (issue.type === unique.type && selector.startsWith(unique.selector + " >")) {
                console.log(`✂️ Solapamiento estructural detectado: "${selector}" es hijo de "${unique.selector}". Fusionando en un único reporte.`);
                isDuplicate = true;
                break;
            }
        }

        if (!isDuplicate) {
            uniqueIssues.push(issue);
        } else {
            duplicatesToDelete.push(issue.id);
        }
    }

    console.log(`✂️ Deduplicación: ${uniqueIssues.length} AEvents únicos y ${duplicatesToDelete.length} duplicados detectados.`);

    // Eliminar duplicados de Supabase para limpiar el reporte final
    if (duplicatesToDelete.length > 0) {
        console.log(`🗑️ Eliminando duplicados de Supabase...`);
        // Primero eliminar de aevents_smells_map
        await supabase.from('aevents_smells_map').delete().in('issue_id', duplicatesToDelete);
        // Luego eliminar de a11y_issues
        const { error: deleteErr } = await supabase.from('a11y_issues').delete().in('id', duplicatesToDelete);
        if (deleteErr) {
            console.warn("⚠️ Advertencia al eliminar duplicados:", deleteErr.message);
        } else {
            console.log(`✅ Duplicados eliminados exitosamente de la base de datos.`);
        }
    }

    // 3. Ejecutar análisis forense con IA para cada issue único
    const cardsHtml = [];
    let processedCount = 0;
    for (const issue of uniqueIssues) {
        processedCount++;
        console.log(`\n────────────────────────────────────────────────────────────`);
        console.log(`🔍 [${processedCount}/${uniqueIssues.size}] Analizando AEvent: "${issue.type}"`);
        console.log(`📍 Selector: ${issue.selector}`);

        let evidenceBase64 = null;
        if (issue.evidence_url) {
            try {
                console.log(`📡 Descargando captura de evidencia...`);
                const response = await fetch(issue.evidence_url);
                if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    evidenceBase64 = Buffer.from(arrayBuffer).toString('base64');
                } else {
                    console.warn(`⚠️ No se pudo descargar la imagen de evidencia (Status: ${response.status})`);
                }
            } catch (err) {
                console.warn(`⚠️ Error al descargar evidencia de ${issue.evidence_url}:`, err.message);
            }
        }

        // Si no pudimos descargar la imagen de evidencia, intentamos usar una vacía
        if (!evidenceBase64) {
            evidenceBase64 = "";
        }

        // Obtener AEvent ID y smells potenciales del catálogo
        let potentialSmells = [];
        try {
            // Buscamos el ID del AEvent por nombre en la DB
            const { data: aeventRow } = await supabase
                .from('aevents')
                .select('id')
                .eq('name', issue.type || 'Generic A11y Event')
                .maybeSingle();

            if (aeventRow) {
                const { data: smellsList } = await supabase
                    .from('smells')
                    .select('id, name, description')
                    .eq('aevent_id', aeventRow.id);
                if (smellsList) {
                    potentialSmells = smellsList;
                }
            }
        } catch (dbErr) {
            console.warn("⚠️ Error al obtener catálogo de smells:", dbErr.message);
        }

        const potentialSmellsText = potentialSmells.length > 0 ? potentialSmells.map(s => s.name).join(', ') : 'Ninguno';
        console.log(`🧬 ASmells Relacionados en Catálogo: ${potentialSmellsText}`);

        // Preparar payload para la función de análisis
        const mockIssueData = {
            type: issue.type,
            name: issue.type,
            description: issue.message,
            message: issue.message,
            url: issue.url,
            selector: issue.selector,
            mutationCode: issue.mutation_code || 'N/A'
        };

        let forensics = {
            mutation: 'Análisis fallido',
            cause: 'No se pudo realizar el análisis forense',
            alternatives: 'N/A',
            confidence: 50,
            isFalsePositive: false,
            severity: 'unknown',
            selected_smell_id: null
        };

        try {
            console.log(`🧠 Solicitando análisis forense al cerebro de IA...`);
            forensics = await analyzeA11ySmell(mockIssueData, evidenceBase64, potentialSmells, aiConfig);
            console.log(`✅ Análisis forense completado con confianza del ${forensics.confidence}%.`);
        } catch (aiErr) {
            console.error(`❌ Error durante el análisis del cerebro:`, aiErr.message);
        }

        // Determinar el Smell UUID
        let selectedSmellId = forensics.selected_smell_id;
        if (!selectedSmellId && potentialSmells.length > 0) {
            selectedSmellId = potentialSmells[0].id;
        }
        if (!selectedSmellId) {
            selectedSmellId = '00000000-0000-0000-0000-000000000000'; // Default UUID
        }

        // 4. Actualizar base de datos con los resultados del análisis
        const dbPayload = {
            mutation_description: forensics.mutation,
            aswell_cause: forensics.cause,
            suggestions: forensics.alternatives || issue.suggestions,
            confidence: forensics.confidence,
            is_false_positive: forensics.isFalsePositive,
            severity: forensics.severity,
            confidence_score: (forensics.confidence || 50) / 100
        };

        const forensicData = {
            smell_id: selectedSmellId,
            technical_explanation: forensics.cause,
            confidence_score: (forensics.confidence || 50) / 100
        };

        // Guardar en a11y_issues
        await supabase.from('a11y_issues').update(dbPayload).eq('id', issue.id);

        // Guardar en aevents_smells_map
        await supabase.from('aevents_smells_map')
            .update(forensicData)
            .eq('issue_id', issue.id);

        const meta = getAEventMetadata(issue.type);

        // 5. Imprimir reporte HTML interactivo
        let html = `<div style="background: #181818; border-radius: 8px; border: 1px solid #ff4444; padding: 18px; width: 780px; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin-top: 15px; color: #f5f5f5; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">`;
        
        // Encabezado
        html += `
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ff4444; padding-bottom: 10px; margin-bottom: 15px;">
              <span style="font-weight: bold; color: #ff4444; font-size: 15px; letter-spacing: 0.5px;">🚨 REPORTE FORENSE DE ACCESIBILIDAD</span>
              <span style="font-size: 11px; background: #ff4444; color: #000; padding: 3px 10px; border-radius: 20px; font-weight: bold; text-transform: uppercase;">${forensics.severity || 'UNKNOWN'}</span>
          </div>
        `;

        // Datos del Evento
        html += `
          <div style="background: #252525; border-radius: 6px; padding: 12px; margin-bottom: 15px; border-left: 4px solid #aaa; font-size: 12px; line-height: 1.5;">
              <div style="margin-bottom: 4px;"><strong>🔔 Evento:</strong> ${issue.type}</div>
              <div style="margin-bottom: 4px;"><strong>📍 Selector DOM:</strong> <code style="background: #333; padding: 2px 6px; border-radius: 3px; font-family: monospace; color: #ff9800; font-size: 11px; display: inline-block; max-width: 550px; overflow-x: auto; vertical-align: middle;">${issue.selector}</code></div>
              <div style="margin-bottom: 4px;"><strong>🧬 Smell Asignado:</strong> ${potentialSmellsText}</div>
              <div><strong>💬 Descripción:</strong> ${issue.message}</div>
          </div>
        `;

        // Ficha Técnica del Sensor (Evaluación Humana)
        html += `
          <div style="background: #1a2535; border-radius: 6px; padding: 15px; margin-bottom: 15px; border-left: 4px solid #2196f3; font-size: 12px; line-height: 1.6; color: #e3f2fd;">
              <div style="font-weight: bold; color: #90caf9; font-size: 13px; margin-bottom: 8px;">🔬 DETALLE TÉCNICO DEL SENSOR (EVALUACIÓN HUMANA)</div>
              <div><strong>🔍 Detección del Evento:</strong> ${meta.detection}</div>
              <div style="margin-top: 6px;"><strong>📊 Datos Considerados en Caliente:</strong> ${meta.considered}</div>
              <div style="margin-top: 6px;"><strong>💾 Resguardado para Análisis de ASmells:</strong> ${meta.saved}</div>
          </div>
        `;

        // Resultados del Cerebro de IA (Forensia)
        html += `
          <div style="background: #1f2a1f; border-radius: 6px; padding: 15px; margin-bottom: 15px; border-left: 4px solid #4caf50; font-size: 12px; line-height: 1.6; color: #e8f5e9;">
              <div style="font-weight: bold; color: #81c784; font-size: 13px; margin-bottom: 10px; display: flex; justify-content: space-between;">
                <span>🧠 DIAGNÓSTICO DE INTELIGENCIA ARTIFICIAL</span>
                <span style="font-size: 11px; color: #a5d6a7;">Confianza: ${forensics.confidence}%</span>
              </div>
              <div style="margin-bottom: 8px;"><strong>🧬 Causa Técnica del A-Smell:</strong><br/>${forensics.cause}</div>
              <div style="margin-bottom: 8px;"><strong>🔄 Mutación DOM Observada:</strong><br/>${forensics.mutation}</div>
              <div><strong>💡 Sugerencia de Corrección de Accesibilidad:</strong><br/><span style="color: #ffb74d;">${forensics.alternatives || 'N/A'}</span></div>
          </div>
        `;

        // Imagen de evidencia
        if (issue.evidence_url) {
            html += `
              <div style="text-align: center; background: #000; border-radius: 6px; padding: 8px; border: 1px solid #333; margin-bottom: 10px;">
                  <div style="font-size: 10px; color: #888; margin-bottom: 5px;">Captura de Pantalla al Momento del Evento</div>
                  <img src="${issue.evidence_url}" style="max-width: 100%; max-height: 380px; object-fit: contain; border-radius: 4px;" />
              </div>
            `;
        }

        html += `</div>`; // Cierre del contenedor principal

        console.log(`[DISPLAY_HTML]: ${html.replace(/\r?\n/g, '')}`);

        // Acumular tarjeta para el reporte HTML descargable
        cardsHtml.push(`
          <div style="background: #181818; border-radius: 8px; border: 1px solid #ff4444; padding: 18px; max-width: 100%; box-sizing: border-box; font-family: sans-serif; margin-top: 15px; color: #f5f5f5; box-shadow: 0 4px 12px rgba(0,0,0,0.5); margin-bottom: 25px;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ff4444; padding-bottom: 10px; margin-bottom: 15px;">
                  <span style="font-weight: bold; color: #ff4444; font-size: 15px; letter-spacing: 0.5px;">🚨 REPORTE FORENSE DE ACCESIBILIDAD</span>
                  <span style="font-size: 11px; background: #ff4444; color: #000; padding: 3px 10px; border-radius: 20px; font-weight: bold; text-transform: uppercase;">${forensics.severity || 'UNKNOWN'}</span>
              </div>
              <div style="background: #252525; border-radius: 6px; padding: 12px; margin-bottom: 15px; border-left: 4px solid #aaa; font-size: 12px; line-height: 1.5;">
                  <div style="margin-bottom: 4px;"><strong>🔔 Evento:</strong> ${issue.type}</div>
                  <div style="margin-bottom: 4px;"><strong>📍 Selector DOM:</strong> <code style="background: #333; padding: 2px 6px; border-radius: 3px; font-family: monospace; color: #ff9800; font-size: 11px; display: inline-block; max-width: 100%; overflow-x: auto; vertical-align: middle;">${issue.selector}</code></div>
                  <div style="margin-bottom: 4px;"><strong>🧬 Smell Asignado:</strong> ${potentialSmellsText}</div>
                  <div><strong>💬 Descripción:</strong> ${issue.message}</div>
                  <div style="margin-top: 4px;"><strong>🔗 URL:</strong> <a href="${issue.url}" target="_blank" style="color: #00bcff; text-decoration: none;">${issue.url}</a></div>
              </div>
              <!-- Ficha Técnica del Sensor (Evaluación Humana) -->
              <div style="background: #1a2535; border-radius: 6px; padding: 15px; margin-bottom: 15px; border-left: 4px solid #2196f3; font-size: 12px; line-height: 1.6; color: #e3f2fd;">
                  <div style="font-weight: bold; color: #90caf9; font-size: 13px; margin-bottom: 8px;">🔬 DETALLE TÉCNICO DEL SENSOR (EVALUACIÓN HUMANA)</div>
                  <div><strong>🔍 Detección del Evento:</strong> ${meta.detection}</div>
                  <div style="margin-top: 6px;"><strong>📊 Datos Considerados en Caliente:</strong> ${meta.considered}</div>
                  <div style="margin-top: 6px;"><strong>💾 Resguardado para Análisis de ASmells:</strong> ${meta.saved}</div>
              </div>
              <div style="background: #1f2a1f; border-radius: 6px; padding: 15px; margin-bottom: 15px; border-left: 4px solid #4caf50; font-size: 12px; line-height: 1.6; color: #e8f5e9;">
                  <div style="font-weight: bold; color: #81c784; font-size: 13px; margin-bottom: 10px; display: flex; justify-content: space-between;">
                    <span>🧠 DIAGNÓSTICO DE INTELIGENCIA ARTIFICIAL</span>
                    <span style="font-size: 11px; color: #a5d6a7;">Confianza: ${forensics.confidence}%</span>
                  </div>
                  <div style="margin-bottom: 8px;"><strong>🧬 Causa Técnica del A-Smell:</strong><br/>${forensics.cause}</div>
                  <div style="margin-bottom: 8px;"><strong>🔄 Mutación DOM Observada:</strong><br/>${forensics.mutation}</div>
                  <div><strong>💡 Sugerencia de Corrección de Accesibilidad:</strong><br/><span style="color: #ffb74d;">${forensics.alternatives || 'N/A'}</span></div>
              </div>
              ${issue.evidence_url ? `
              <div style="text-align: center; background: #000; border-radius: 6px; padding: 8px; border: 1px solid #333; margin-bottom: 10px;">
                  <div style="font-size: 10px; color: #888; margin-bottom: 5px;">Captura de Pantalla al Momento del Evento</div>
                  <img src="${issue.evidence_url}" style="max-width: 100%; max-height: 450px; object-fit: contain; border-radius: 4px;" />
              </div>` : ''}
          </div>
        `);
    }

    // Construir el documento HTML completo descargable
    const fullHtml = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Reporte de Accesibilidad - Fisgón Engine</title>
    <style>
        body { background-color: #0f0f11; color: #eaeaea; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 40px 20px; display: flex; flex-direction: column; align-items: center; }
        .container { width: 100%; max-width: 900px; }
        .header { border-bottom: 3px solid #ff4444; padding-bottom: 20px; margin-bottom: 30px; text-align: center; }
        .header h1 { color: #ff4444; margin: 0 0 10px 0; font-size: 28px; letter-spacing: 0.5px; }
        .header p { color: #888; margin: 0; font-size: 14px; }
        .summary-box { background: #1a1a1f; border-radius: 8px; padding: 20px; margin-bottom: 30px; border: 1px solid #333; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .summary-item { text-align: center; }
        .summary-val { font-size: 24px; font-weight: bold; color: #ffb74d; margin-top: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Fisgón Engine - Reporte de Accesibilidad</h1>
            <p>Auditoría Automática Impulsada por Inteligencia Artificial</p>
        </div>
        
        <div class="summary-box">
            <div class="summary-item">
                <div>Sesión ID</div>
                <div class="summary-val" style="font-size: 14px; font-family: monospace;">${sessionId}</div>
            </div>
            <div class="summary-item">
                <div>AEvents Únicos</div>
                <div class="summary-val">${uniqueIssues.length}</div>
            </div>
            <div class="summary-item">
                <div>Fecha Auditoría</div>
                <div class="summary-val" style="font-size: 14px;">${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}</div>
            </div>
        </div>

        ${cardsHtml.join('\n')}

        <!-- Bitácora de Acciones de Navegación -->
        ${(() => {
            if (actionSteps.length === 0) return '';
            let actionLogHtml = `
            <h2 style="color: #ff9800; border-bottom: 2px dashed #333; padding-bottom: 8px; margin-top: 40px; margin-bottom: 20px;">📋 Bitácora de Acciones de Navegación del Bot</h2>
            <div style="background: #1a1a1f; border: 1px solid #333; border-radius: 8px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                <div style="display: flex; flex-direction: column; gap: 15px; border-left: 2px solid #333; padding-left: 15px; margin-left: 10px;">
            `;

            actionSteps.forEach((step, idx) => {
                const timeStr = new Date(step.timestamp).toLocaleTimeString('es-ES');
                actionLogHtml += `
                    <div style="position: relative;">
                        <div style="position: absolute; left: -21px; top: 4px; width: 10px; height: 10px; border-radius: 50%; background: ${step.success ? '#4caf50' : '#f44336'}; border: 2px solid #1a1a1f;"></div>
                        <div style="font-size: 11px; color: #888; margin-bottom: 3px;">Paso ${idx + 1} - ${timeStr}</div>
                        <div style="font-size: 13px; line-height: 1.4;">
                            <span style="font-weight: bold; color: #4caf50; text-transform: uppercase;">${step.action}</span> sobre 
                            <span style="color: #ffb74d;">${step.widget_label || 'elemento'}</span> 
                            (${step.widget_type || 'N/A'})
                        </div>
                        ${step.value ? `<div style="font-size: 12px; color: #bbb; margin-top: 2px; font-family: monospace; background: #252525; padding: 2px 6px; border-radius: 4px; display: inline-block;">Valor: "${step.value}"</div>` : ''}
                        ${step.analysis ? `<div style="font-size: 11px; color: #aaa; margin-top: 4px; font-style: italic;">Análisis de IA: "${step.analysis}"</div>` : ''}
                    </div>
                `;
            });

            actionLogHtml += `
                </div>
            </div>
            `;
            return actionLogHtml;
        })()}
    </div>
</body>
</html>`;

    // Escribir en el disco (encarpetado por batchId)
    const batchDir = path.resolve(__dirname, `../reports/${batchId}`);
    if (!fs.existsSync(batchDir)) {
        fs.mkdirSync(batchDir, { recursive: true });
    }
    let safeUrl = 'unknown';
    if (sessionRow && sessionRow.url) {
        try {
            safeUrl = sessionRow.url.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/[^a-zA-Z0-9]/g, '_');
        } catch (e) {}
    }
    const reportPath = path.join(batchDir, `report_${safeUrl}_${sessionId}.html`);
    fs.writeFileSync(reportPath, fullHtml, 'utf8');

    // Subir el reporte a Supabase Storage
    try {
        const fileData = fs.readFileSync(reportPath);
        const storagePath = `sessions/${sessionId}/reports/report_forense_${safeUrl}_${sessionId}.html`;
        
        const { error: uploadError } = await supabase.storage
            .from('fisgon_evidence')
            .upload(storagePath, fileData, { contentType: 'text/html', upsert: true });

        console.log(`\n============================================================`);
        console.log(`✅ AUDITORÍA FORENSE COMPLETADA CON ÉXITO`);
        console.log(`📦 Se analizaron y actualizaron ${processedCount} AEvents en Supabase.`);
        console.log(`[REPORT_FILE]: ${reportPath}`);

        if (uploadError) {
            console.error(`[Supabase Upload] Error al subir el reporte forense:`, uploadError.message);
        } else {
            const { data: signedData } = await supabase.storage
                .from('fisgon_evidence')
                .createSignedUrl(storagePath, 60 * 60 * 24 * 7); // Firmar por 7 días
            
            console.log(`🌐 [Supabase Forensic Report URL]: ${signedData?.signedUrl}`);
        }
        console.log(`============================================================\n`);
    } catch (err) {
        console.error('[Supabase Upload Exception] Falló la subida del reporte forense:', err.message);
    }
}

runPostAnalysis().catch(err => {
    console.error("❌ Error catastrófico en post-análisis:", err);
    process.exit(1);
});
