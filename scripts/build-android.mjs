// Builds the TanStack Start app in static SPA mode and assembles a plain
// static bundle that Capacitor (Android) or GitHub Pages (iOS PWA install)
// can serve with no server. Output folder defaults to "android-dist"; pass
// a different one as argv[2] (e.g. "pages-dist") for a Pages build, and set
// PUBLIC_BASE_PATH accordingly before running "npm run build" first.
import { cp, rename, rm, access } from "node:fs/promises";
import { existsSync } from "node:fs";

const OUT_PUBLIC = ".output/public";
const TARGET = process.argv[2] || "android-dist";

async function main() {
  if (!existsSync(OUT_PUBLIC)) {
    console.error(`Expected ${OUT_PUBLIC} to exist — run "npm run build" first.`);
    process.exit(1);
  }

  await rm(TARGET, { recursive: true, force: true });
  await cp(OUT_PUBLIC, TARGET, { recursive: true });

  // The PWA plugin's generateSW step writes sw.js + its workbox chunk into
  // the default Vite "dist/" folder, separate from the TanStack Start
  // ".output/public" bundle. Copy them alongside index.html so the app's
  // own registerSW() (which fetches "/sw.js") actually finds it — this is
  // what gives the static build real offline caching (e.g. for a PWA).
  if (existsSync("dist")) {
    const { readdir } = await import("node:fs/promises");
    const distFiles = await readdir("dist");
    for (const f of distFiles) {
      if (f === "sw.js" || f.startsWith("workbox-")) {
        await cp(`dist/${f}`, `${TARGET}/${f}`);
      }
    }
  }

  const shell = `${TARGET}/_shell.html`;
  const index = `${TARGET}/index.html`;
  try {
    await access(shell);
    await rename(shell, index);
  } catch {
    if (!existsSync(index)) {
      console.error(`Neither _shell.html nor index.html found in ${OUT_PUBLIC}. ` +
        `Did the "spa: { enabled: true }" prerender step run?`);
      process.exit(1);
    }
  }

  // manifest.webmanifest is a static public/ file, so Vite's base-path
  // rewriting (which fixes JS/CSS references) doesn't touch it. Rewrite its
  // root-absolute paths by hand so "Add to Home Screen" launches correctly
  // and the icon resolves when this is served from a subpath (GitHub Pages).
  const base = process.env.PUBLIC_BASE_PATH || "/";
  if (base !== "/") {
    const manifestPath = `${TARGET}/manifest.webmanifest`;
    if (existsSync(manifestPath)) {
      const { readFile, writeFile } = await import("node:fs/promises");
      const manifest = JSON.parse(await readFile(manifestPath, "utf-8"));
      const rebase = (p) => (typeof p === "string" && p.startsWith("/") ? base + p.slice(1) : p);
      if (manifest.start_url) manifest.start_url = rebase(manifest.start_url);
      if (Array.isArray(manifest.icons)) {
        manifest.icons = manifest.icons.map((icon) => ({ ...icon, src: rebase(icon.src) }));
      }
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    }
  }

  console.log(`Static bundle ready at ${TARGET}/ (entry: index.html, base: ${base})`);
}

main();
