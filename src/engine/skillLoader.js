import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const skillsRoot = path.resolve(__dirname, '../skills');

/**
 * Loads all detection skill scripts and metadata from src/skills/
 */
export function loadAllDetectionSkills() {
    const skills = [];
    if (!fs.existsSync(skillsRoot)) {
        return skills;
    }

    const entries = fs.readdirSync(skillsRoot, { withFileTypes: true });
    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const skillDir = path.join(skillsRoot, entry.name);
        const scriptPath = path.join(skillDir, 'scripts', 'detect.js');
        const metaPath = path.join(skillDir, 'SKILL.md');

        let scriptCode = '';
        if (fs.existsSync(scriptPath)) {
            scriptCode = fs.readFileSync(scriptPath, 'utf8');
        }

        let metadata = {
            id: entry.name,
            name: entry.name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            description: ''
        };

        if (fs.existsSync(metaPath)) {
            const content = fs.readFileSync(metaPath, 'utf8');
            const nameMatch = content.match(/name:\s*(.+)/);
            const descMatch = content.match(/description:\s*(.+)/);
            if (nameMatch) metadata.name = nameMatch[1].trim();
            if (descMatch) metadata.description = descMatch[1].trim();
        }

        skills.push({
            id: entry.name,
            metadata,
            scriptCode
        });
    }

    return skills;
}

/**
 * Injects all AEvent detection probes into a Puppeteer Page instance
 * @param {import('puppeteer').Page} page
 */
export async function injectDetectionSkills(page) {
    const skills = loadAllDetectionSkills();
    
    // Inject global event aggregator
    await page.evaluate(() => {
        if (!window.__fisgonAEvents) {
            window.__fisgonAEvents = [];
        }
    });

    let injectedCount = 0;
    for (const skill of skills) {
        if (skill.scriptCode) {
            try {
                await page.evaluate((code) => {
                    try {
                        const scriptEl = document.createElement('script');
                        scriptEl.textContent = code;
                        (document.head || document.documentElement).appendChild(scriptEl);
                    } catch (err) {
                        console.error('Failed injecting probe:', err);
                    }
                }, skill.scriptCode);
                injectedCount++;
            } catch (e) {
                // Ignore page detachment errors
            }
        }
    }

    return injectedCount;
}
