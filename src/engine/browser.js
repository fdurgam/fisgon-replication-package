import puppeteer from 'puppeteer';
import { NVDASpeechEmulatorCode } from '../emulator/nvdaSpeechEmulator.js';
import { injectDetectionSkills } from './skillLoader.js';

/**
 * Initializes the virtual browser environment with CDP and injected probes.
 */
export async function initializeVirtualEnvironment(options = {}) {
    const headless = options.headless ?? (process.env.HEADLESS === 'true');
    
    const browser = await puppeteer.launch({
        headless: headless ? 'new' : false,
        defaultViewport: { width: 1280, height: 800 },
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process'
        ]
    });

    const page = await browser.newPage();

    // Attach Chrome DevTools Protocol (CDP) session for accessibility tree extraction
    const client = await page.target().createCDPSession();
    await client.send('Accessibility.enable');

    // Injected console listener to capture AEvents printed by detection probes
    const detectedAEvents = [];
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('🔔 EVENTO DETECTADO') || text.includes('AEvent') || text.includes('Threat')) {
            detectedAEvents.push({
                timestamp: new Date().toISOString(),
                rawLog: text
            });
        }
    });

    return {
        browser,
        page,
        client,
        detectedAEvents
    };
}

/**
 * Injects the NVDA Screen Reader speech emulator and AEvent detection probes into the active page.
 */
export async function injectProbes(page) {
    // 1. Inject NVDA Screen Reader Emulator
    await page.evaluate((emulatorCode) => {
        try {
            const script = document.createElement('script');
            script.textContent = emulatorCode;
            (document.head || document.documentElement).appendChild(script);
        } catch (e) {
            console.error('Error injecting NVDA emulator:', e);
        }
    }, NVDASpeechEmulatorCode);

    // 2. Inject AEvent Detection Skills
    const count = await injectDetectionSkills(page);
    return count;
}
