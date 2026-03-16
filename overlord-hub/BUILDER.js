import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = __dirname;
const SRC_TAURI = path.join(ROOT, 'src-tauri');
const RESOURCES = path.join(SRC_TAURI, 'resources', 'overlord-lite');
const SOURCE_EXTENSION = path.resolve(ROOT, '..', 'overlord-lite');

// Helper to copy directory recursively
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

async function build() {
  console.log('\x1b[36m%s\x1b[0m', '🚀 Starting Overlord Hub Build Process...');

  try {
    // 1. Sync extension resources
    console.log('\x1b[33m%s\x1b[0m', '📂 Syncing extension resources...');
    if (fs.existsSync(RESOURCES)) {
      console.log('   Cleaning existing resources...');
      fs.rmSync(RESOURCES, { recursive: true, force: true });
    }
    
    if (fs.existsSync(SOURCE_EXTENSION)) {
      copyRecursiveSync(SOURCE_EXTENSION, RESOURCES);
      console.log('\x1b[32m%s\x1b[0m', '   ✅ Extension resources synced.');
    } else {
      console.warn('\x1b[31m%s\x1b[0m', `   ⚠️ Warning: Source extension not found at ${SOURCE_EXTENSION}`);
      console.log('   Continuing with existing resources if any...');
    }

    // 2. Build Frontend (Vite)
    console.log('\x1b[33m%s\x1b[0m', '💻 Building frontend (Vite)...');
    execSync('npm run build', { stdio: 'inherit', cwd: ROOT });
    console.log('\x1b[32m%s\x1b[0m', '   ✅ Frontend built.');

    // 3. Build Tauri App
    console.log('\x1b[33m%s\x1b[0m', '🦀 Building Tauri application...');
    // We use npx tauri build directly to ensure we're using the CLI correctly
    execSync('npx tauri build', { stdio: 'inherit', cwd: ROOT });
    
    console.log('\x1b[32m%s\x1b[0m', '🎉 Build completed successfully!');
    console.log('\x1b[36m%s\x1b[0m', '📦 You can find the installers in src-tauri/target/release/bundle/');

  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Build failed:');
    console.error(error.message);
    process.exit(1);
  }
}

build();
