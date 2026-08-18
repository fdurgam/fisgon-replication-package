import { initializeVirtualEnvironment, injectProbes } from './browser.js';
import { askBrain } from '../ai/askBrain.js';
import { generateRandomPersona } from './personaGenerator.js';
import { extractWidgetProfile } from './widgetDriver.js';

const DEFAULT_KEY_DELAY_MS = 10; // 0.01s default interval preventing browser from skipping DOM handlers
const DEFAULT_NAV_DELAY_MS = 500; // 0.5s default settling time for async DOM/a11y tree updates

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Executes the main accessibility simulation and interaction loop (Algorithm 1)
 */
export async function runSimulation(targetUrl, options = {}) {
    const maxSteps = options.maxSteps || parseInt(process.env.MAX_STEPS || '30', 10);
    const keyDelay = options.keyDelay !== undefined ? options.keyDelay : DEFAULT_KEY_DELAY_MS;
    const navDelay = options.navDelay !== undefined ? options.navDelay : DEFAULT_NAV_DELAY_MS;
    const persona = generateRandomPersona();
    const startTime = Date.now();

    console.log('\n' + '='.repeat(70));
    console.log(`🚀 [Fisgón Engine] Starting Simulation on: ${targetUrl}`);
    console.log(`👤 Active Persona: ${persona.nombre} ${persona.apellido} (DNI: ${persona.dni})`);
    console.log(`⏱️ Timing Configuration: Key Delay = ${keyDelay}ms | Navigation Delay = ${navDelay}ms`);
    console.log('='.repeat(70) + '\n');

    const env = await initializeVirtualEnvironment(options);
    const { browser, page, detectedAEvents } = env;

    const report = {
        url: targetUrl,
        timestamp: new Date().toISOString(),
        persona,
        stepsExecuted: 0,
        timeline: [],
        detectedAEvents: [],
        summary: {}
    };

    try {
        // Navigate to target URL
        if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
            await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        } else {
            // Local file path
            await page.goto(`file://${targetUrl.replace(/\\/g, '/')}`, { waitUntil: 'load' });
        }

        // Inject probes and NVDA emulator
        const injectedCount = await injectProbes(page);
        console.log(`[Fisgón Engine] Injected NVDA emulator & ${injectedCount} AEvent detection probes.`);

        // Initial navigation settling wait
        await sleep(navDelay);

        let k = 0;
        let previousFocusedElement = null;

        while (k < maxSteps && !page.isClosed()) {
            k++;
            console.log(`\n--- [Step ${k}/${maxSteps}] ---`);

            // 1. Capture currently active focused element
            const activeProfile = await page.evaluate(() => {
                const el = document.activeElement;
                if (!el || el === document.body) return null;
                
                const rect = el.getBoundingClientRect();
                return {
                    tag: el.tagName.toLowerCase(),
                    type: el.type || '',
                    id: el.id || '',
                    className: el.className || '',
                    label: el.getAttribute('aria-label') || el.labels?.[0]?.innerText || el.placeholder || '',
                    text: el.innerText || el.textContent || '',
                    value: el.value || '',
                    role: el.getAttribute('role') || el.tagName.toLowerCase(),
                    placeholder: el.placeholder || '',
                    isContentEditable: el.isContentEditable,
                    visible: rect.width > 0 && rect.height > 0
                };
            });

            // 2. Synthesize Screen Reader announcement
            const speechText = await page.evaluate(() => {
                if (window.NVDASpeechEmulator && document.activeElement) {
                    return window.NVDASpeechEmulator.announce(document.activeElement);
                }
                return '';
            }).catch(() => '');

            if (speechText) {
                console.log(`🔊 [NVDA Speech] "${speechText}"`);
            }

            // 3. AI Agent derivation
            let derivedAction = null;
            if (activeProfile && activeProfile.tag !== 'body') {
                console.log(`🎯 Active Focus: <${activeProfile.tag}> ${activeProfile.label ? `[Label: "${activeProfile.label}"]` : ''} ${activeProfile.type ? `(type: ${activeProfile.type})` : ''}`);
                
                derivedAction = await askBrain(activeProfile, null, persona);
                console.log(`🤖 [Agent Decision] Action: ${derivedAction.skip ? 'SKIP' : 'INPUT'} -> Value: "${derivedAction.datosGenerados || ''}" | Reason: ${derivedAction.analisis}`);
            }

            // 4. Execute Interaction
            const isInput = activeProfile && (activeProfile.tag === 'input' || activeProfile.tag === 'textarea');
            const isSelect = activeProfile && activeProfile.tag === 'select';
            const isButton = activeProfile && (activeProfile.tag === 'button' || activeProfile.type === 'submit');

            if (isInput && derivedAction && derivedAction.datosGenerados && !derivedAction.skip) {
                // Real keyboard typing with key delay
                await page.keyboard.type(String(derivedAction.datosGenerados), { delay: keyDelay });
            } else if (isSelect && !derivedAction?.skip) {
                await page.keyboard.press('ArrowDown');
                await sleep(50);
                await page.keyboard.press('Enter');
            } else if (isButton && !derivedAction?.skip) {
                // If it is a submit button or modal trigger
                await page.keyboard.press('Enter');
            }

            // Record Step Evidence
            const stepEvidence = {
                step: k,
                timestamp: new Date().toISOString(),
                activeElement: activeProfile,
                speechOutput: speechText,
                derivedAction
            };
            report.timeline.push(stepEvidence);

            // 5. Advance navigation: Press TAB to move focus forward
            await page.keyboard.press('Tab');

            // 6. Navigation delay for async operations and a11y tree to settle
            await sleep(navDelay);
        }

        report.stepsExecuted = k;

        // 7. Consolidate detected AEvents
        report.detectedAEvents = detectedAEvents;
        
        // Group AEvents by type
        const aEventCounts = {};
        for (const ev of detectedAEvents) {
            const raw = ev.rawLog || '';
            const match = raw.match(/\[(.*?)\]/);
            const eventName = match ? match[1] : 'Unclassified AEvent';
            aEventCounts[eventName] = (aEventCounts[eventName] || 0) + 1;
        }
        report.summary = {
            totalAEvents: detectedAEvents.length,
            breakdown: aEventCounts,
            durationSeconds: ((Date.now() - startTime) / 1000).toFixed(2)
        };

    } catch (err) {
        console.error('❌ Simulation Error:', err.message);
        report.error = err.message;
    } finally {
        await browser.close();
    }

    console.log('\n' + '='.repeat(70));
    console.log(`✅ [Fisgón Engine] Simulation Completed in ${report.summary.durationSeconds || 0}s`);
    console.log(`📊 Total AEvents Detected: ${report.summary.totalAEvents || 0}`);
    console.log('='.repeat(70) + '\n');

    return report;
}
