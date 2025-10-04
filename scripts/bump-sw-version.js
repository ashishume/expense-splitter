#!/usr/bin/env node

/**
 * Automatically bump the service worker version before build
 * This ensures mobile browsers always get the latest updates
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const swPath = path.join(__dirname, "../public/sw.js");

try {
  let content = fs.readFileSync(swPath, "utf8");

  // Extract current version
  const versionMatch = content.match(/const VERSION = "v(\d+)\.(\d+)\.(\d+)"/);

  if (versionMatch) {
    const [, major, minor, patch] = versionMatch;
    const newPatch = parseInt(patch) + 1;
    const newVersion = `v${major}.${minor}.${newPatch}`;

    // Replace version
    content = content.replace(
      /const VERSION = "v\d+\.\d+\.\d+"/,
      `const VERSION = "${newVersion}"`
    );

    // Write back to file
    fs.writeFileSync(swPath, content);

    console.log(`✅ Service Worker version bumped to ${newVersion}`);
    console.log("📱 Mobile browsers will now receive the update!");
  } else {
    console.error("❌ Could not find VERSION constant in sw.js");
    process.exit(1);
  }
} catch (error) {
  console.error("❌ Error bumping service worker version:", error.message);
  process.exit(1);
}
