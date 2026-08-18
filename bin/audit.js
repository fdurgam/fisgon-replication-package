#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnv } from '../src/engine/envLoader.js';
import { runSimulation } from '../src/engine/simulationLoop.js';

loadEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse CLI arguments
const args = {};
process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
        const firstEqual = arg.indexOf('=');
        const key = firstEqual !== -1 ? arg.slice(2, firstEqual) : arg.slice(2);
        const val = firstEqual !== -1 ? arg.slice(firstEqual + 1) : true;
        args[key] = val;
    }
});

let targetUrl = args.url || process.env.TARGET_URL;

if (!targetUrl) {
    // Default to bundled local demo form
    targetUrl = path.resolve(__dirname, '../examples/sample-form/index.html');
} else if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    // Resolve relative path to absolute file path
    targetUrl = path.resolve(process.cwd(), targetUrl);
}

function parseDurationMs(val, fallback) {
    if (val === undefined || val === null || val === '') return fallback;
    const num = parseFloat(val);
    if (isNaN(num)) return fallback;
    // If less than 5, assume seconds (e.g. 0.01s or 0.5s from .env) and convert to ms
    return num < 5 ? Math.round(num * 1000) : Math.round(num);
}

if (args.apiKey || args.api_key || args.geminiKey) {
    process.env.GEMINI_API_KEY = args.apiKey || args.api_key || args.geminiKey;
}

if (args.model) {
    process.env.GEMINI_MODEL = args.model;
}

const maxSteps = parseInt(args.steps || process.env.MAX_STEPS || '25', 10);
const headless = args.headless === 'true' || args.headless === true || process.env.HEADLESS === 'true';

const rawKeyDelay = args.keyDelay ?? args.key_delay ?? process.env.SIMULATION_KEY_DELAY ?? process.env.KEY_DELAY;
const rawNavDelay = args.navDelay ?? args.nav_delay ?? args.delay ?? process.env.SIMULATION_NAVIGATION_DELAY ?? process.env.NAV_DELAY;

const keyDelay = parseDurationMs(rawKeyDelay, 10);
const navDelay = parseDurationMs(rawNavDelay, 500);

async function main() {
    console.log(`
┌─────────────────────────────────────────────────────────────┐
│                       FISGÓN ENGINE                         │
│   Dynamic Web Accessibility Smell & AEvent Detection Tool   │
└─────────────────────────────────────────────────────────────┘
`);

    const report = await runSimulation(targetUrl, {
        maxSteps,
        headless,
        keyDelay,
        navDelay
    });

    // Save report to reports/ directory
    const reportsDir = path.resolve(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFilePath = path.join(reportsDir, `audit_report_${timestamp}.json`);
    fs.writeFileSync(reportFilePath, JSON.stringify(report, null, 2), 'utf8');

    console.log(`\n📄 [Report Saved] Full audit details saved to:`);
    console.log(`   ${reportFilePath}`);

    if (report.summary && report.summary.breakdown) {
        console.log(`\n📊 [Detected AEvents Breakdown]:`);
        console.table(
            Object.entries(report.summary.breakdown).map(([event, count]) => ({
                'Accessibility Event (AEvent)': event,
                'Detections': count
            }))
        );
    }
}

main().catch(err => {
    console.error('Fatal execution error:', err);
    process.exit(1);
});
