// Builds the TanStack Start app in static SPA mode and assembles a plain
// static bundle (android-dist/) that Capacitor can embed with no server.
import { cp, rename, rm, access } from "node:fs/promises";
import { existsSync } from "node:fs";

const OUT_PUBLIC = ".output/public";
const TARGET = "android-dist";

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

  console.log(`Static bundle ready at ${TARGET}/ (entry: index.html)`);
}

main();
