const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src/content');
const destDir = path.join(__dirname, '../dist/src/content');

function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

console.log(`Copying content scripts from ${srcDir} to ${destDir}...`);
try {
    copyDir(srcDir, destDir);
    console.log('Content scripts copied successfully.');
} catch (err) {
    console.error('Error copying content scripts:', err);
    process.exit(1);
}
