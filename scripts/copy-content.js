import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(scriptDir, '../src/content');
const destDir = path.join(scriptDir, '../dist/src/content');

function copyDir(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) copyDir(srcPath, destPath);
        else fs.copyFileSync(srcPath, destPath);
    }
}
console.log(`Copying content scripts from ${srcDir} to ${destDir}...`);
try {
    copyDir(srcDir, destDir);
    console.log('Content scripts copied successfully.');
} catch (error) {
    console.error('Error copying content scripts:', error);
    process.exit(1);
}
