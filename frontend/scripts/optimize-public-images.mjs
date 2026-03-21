import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const rootDir = path.resolve("frontend/public");

const targets = [
  {
    dir: path.join(rootDir, "imagesproject"),
    match: /\.(jpe?g|png)$/i,
  },
  {
    dir: rootDir,
    match: /^(abacus|handwriting|stem|Vedic-Maths)\.png$/i,
  },
];

async function walk(dir, matcher) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath, matcher));
      continue;
    }
    if (matcher.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function getConfig(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const normalized = filePath.replaceAll(path.sep, "/");

  if (ext === ".png") {
    const isHeroCard = normalized.includes("/homepage/");
    const maxWidth = isHeroCard ? 1280 : 1200;
    return {
      format: "png",
      resize: { width: maxWidth, withoutEnlargement: true },
      encode: { compressionLevel: 9, quality: 70, palette: true, effort: 10 },
    };
  }

  const isLogo = normalized.endsWith("/logo.ico.jpg");
  const isCarousel = /\/imagesproject\/[^/]+\.(jpe?g)$/i.test(normalized) && !normalized.includes("/homepage/");
  const maxWidth = isLogo ? 1200 : isCarousel ? 1600 : 1400;
  const quality = isLogo ? 68 : 72;

  return {
    format: "jpeg",
    resize: { width: maxWidth, withoutEnlargement: true },
    encode: { quality, mozjpeg: true, progressive: true },
  };
}

async function optimize(filePath) {
  const before = (await fs.stat(filePath)).size;
  const config = getConfig(filePath);
  let pipeline = sharp(filePath).rotate().resize(config.resize);

  if (config.format === "png") {
    pipeline = pipeline.png(config.encode);
  } else {
    pipeline = pipeline.jpeg(config.encode);
  }

  const output = await pipeline.toBuffer();
  await fs.writeFile(filePath, output);
  const after = (await fs.stat(filePath)).size;

  return {
    filePath,
    before,
    after,
    saved: before - after,
  };
}

function prettyMb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function main() {
  const files = [];
  for (const target of targets) {
    files.push(...await walk(target.dir, target.match));
  }

  let totalBefore = 0;
  let totalAfter = 0;

  for (const filePath of files) {
    const result = await optimize(filePath);
    totalBefore += result.before;
    totalAfter += result.after;
    process.stdout.write(
      `${path.relative(rootDir, filePath)}: ${prettyMb(result.before)} -> ${prettyMb(result.after)}\n`,
    );
  }

  process.stdout.write(
    `Total: ${prettyMb(totalBefore)} -> ${prettyMb(totalAfter)} (saved ${prettyMb(totalBefore - totalAfter)})\n`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
