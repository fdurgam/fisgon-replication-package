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

const maxSteps = parseInt(args.steps || process.env.MAX_STEPS || '25', 10);
const headless = args.headless === 'true' || args.headless === true;
const keyDelay = args.keyDelay ? parseInt(args.keyDelay, 10) : undefined;
const navDelay = args.navDelay ? parseInt(args.navDelay, 10) : (args.delay ? parseInt(args.delay, 10) : undefined);

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
