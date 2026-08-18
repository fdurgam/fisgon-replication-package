import { GoogleGenerativeAI } from "@google/generative-ai";
import { generateRandomPersona } from "../engine/personaGenerator.js";

/**
 * Generates local heuristic values when offline or as a fast fallback.
 */
export function getHeuristicValue(profile) {
    if (!profile) return null;
    const label = (profile.label || '').toLowerCase();
    const tag = (profile.tag || '').toLowerCase();
    const type = (profile.type || '').toLowerCase();

    const targetPersona = generateRandomPersona();

    if (type === 'email' || label.includes('correo') || label.includes('email') || label.includes('mail')) {
        return targetPersona.email;
    }
    if (type === 'number' || label.includes('postal')) {
        return '4530';
    }
    if (type === 'password' || label.includes('contraseña') || label.includes('clave')) {
        return targetPersona.contrasena;
    }
    if (type === 'tel' || label.includes('teléfono') || label.includes('celular') || label.includes('phone')) {
        return targetPersona.telefono;
    }
    if (type === 'date' || label.includes('fecha') || label.includes('nacimiento') || label.includes('birth')) {
        return '1995-05-12';
    }
    if (label.includes('dni') || label.includes('documento') || label.includes('id') || label.includes('nro')) {
        return targetPersona.dni;
    }
    if (label.includes('nombre') || label.includes('first name') || label.includes('name')) {
        return targetPersona.nombre;
    }
    if (label.includes('apellido') || label.includes('last name') || label.includes('surname')) {
        return targetPersona.apellido;
    }
    if (label.includes('ciudad') || label.includes('city')) {
        return 'La Plata';
    }
    if (label.includes('dirección') || label.includes('address')) {
        return targetPersona.direccion;
    }

    if (tag === 'input' && type === 'text') return 'Test User';
    if (tag === 'textarea') return 'Interaction simulation testing dynamic web accessibility events.';

    return null;
}

/**
 * Asks Google Gemini to derive the next keyboard action and input value for an interactive element.
 */
export async function askBrain(widgetProfile, screenshotBase64 = null, persona = null, options = {}) {
    const apiKey = process.env.GEMINI_API_KEY;
    const activePersona = persona || generateRandomPersona();

    // Deterministic pre-AI escape heuristics (avoid accidental form exit)
    const tag = (widgetProfile.tag || '').toLowerCase();
    const type = (widgetProfile.type || '').toLowerCase();
    const label = (widgetProfile.label || '').toLowerCase();

    const abandonKeywords = ['volver', 'cancelar', 'salir', 'atrás', 'cancel', 'exit', 'back', 'reset'];
    const isClickable = tag === 'button' || tag === 'a' || type === 'button' || type === 'submit';

    if (isClickable && abandonKeywords.some(word => label.includes(word))) {
        return {
            datosGenerados: null,
            analisis: "Bypassed via local heuristic to avoid accidental form abandonment.",
            escenario_elegido: "A",
            skip: true
        };
    }

    // If no API key is provided, use deterministic heuristic generator
    if (!apiKey) {
        const fallbackValue = getHeuristicValue(widgetProfile);
        return {
            datosGenerados: fallbackValue,
            analisis: "Synthesized via local heuristic generator (No GEMINI_API_KEY provided).",
            escenario_elegido: "A",
            skip: false
        };
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
        const model = genAI.getGenerativeModel({ model: modelName });

        const prompt = `You are Fisgón Engine, an autonomous AI agent performing keyboard-based accessibility auditing on web forms.
Current Interactive Element Profile:
- Tag: <${widgetProfile.tag || 'unknown'}>
- Type: ${widgetProfile.type || 'N/A'}
- Accessible Label / Name: "${widgetProfile.label || ''}"
- Role: ${widgetProfile.role || 'N/A'}
- Visual Text: "${widgetProfile.text || ''}"
- Current Value: "${widgetProfile.value || ''}"
- Placeholder: "${widgetProfile.placeholder || ''}"

Active Simulated User Persona:
- Full Name: ${activePersona.nombre} ${activePersona.apellido}
- National ID: ${activePersona.dni}
- Email: ${activePersona.email}
- Phone: ${activePersona.telefono}
- Address: ${activePersona.direccion}

Goal: Formulate the appropriate input or action to exercise this field seamlessly during simulated keyboard navigation.
Respond strictly in valid JSON format:
{
  "datosGenerados": "<string value to type or null if click/press Enter>",
  "analisis": "<brief 1-sentence reasoning>",
  "escenario_elegido": "A",
  "skip": false
}`;

        const parts = [{ text: prompt }];
        if (screenshotBase64) {
            parts.push({
                inlineData: {
                    mimeType: "image/jpeg",
                    data: screenshotBase64
                }
            });
        }

        const result = await model.generateContent(parts);
        const textResponse = result.response.text();
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        
        return {
            datosGenerados: getHeuristicValue(widgetProfile),
            analisis: "Parsed standard response from Gemini.",
            escenario_elegido: "A",
            skip: false
        };
    } catch (error) {
        console.warn(`[askBrain] AI derivation failed (${error.message}). Falling back to local heuristic.`);
        return {
            datosGenerados: getHeuristicValue(widgetProfile),
            analisis: `Fallback to heuristic generator: ${error.message}`,
            escenario_elegido: "A",
            skip: false
        };
    }
}
