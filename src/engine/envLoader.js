import fs from 'fs';
import path from 'path';

/**
 * Loads .env variables into process.env without external dependencies.
 */
export function loadEnv(envPath = '.env') {
    try {
        const fullPath = path.resolve(process.cwd(), envPath);
        if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) continue;
                const eqIdx = trimmed.indexOf('=');
                if (eqIdx !== -1) {
                    const key = trimmed.slice(0, eqIdx).trim();
                    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
                    if (!process.env[key]) {
                        process.env[key] = val;
                    }
                }
            }
        }
    } catch (e) {
        // Silently skip if cannot read .env
    }
}
