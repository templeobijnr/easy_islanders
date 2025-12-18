import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';

function listFiles(command) {
  const out = execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
  return out ? out.split('\n').filter(Boolean) : [];
}

function hasLoggerImportForWeb(content) {
  return /import\s*\{\s*logger\s*\}\s*from\s*['"]@\/utils\/logger['"]/.test(content);
}

function hasLoggerImportForFunctions(content) {
  return /from\s*['"]firebase-functions\/logger['"]/.test(content);
}

function findInsertIndex(lines) {
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      i += 1;
      continue;
    }
    if (trimmed.startsWith('//')) {
      i += 1;
      continue;
    }
    if (trimmed.startsWith('/*')) {
      i += 1;
      while (i < lines.length && !lines[i].includes('*/')) i += 1;
      if (i < lines.length) i += 1;
      continue;
    }
    break;
  }
  return i;
}

async function rewriteFile(path, { importLine, replaceFrom, replaceTo, hasImport }) {
  const original = await fs.readFile(path, 'utf8');
  if (!original.includes(replaceFrom)) return false;

  let next = original.split(replaceFrom).join(replaceTo);

  if (!hasImport(next)) {
    const lines = next.split('\n');
    const insertAt = findInsertIndex(lines);
    lines.splice(insertAt, 0, importLine);
    next = lines.join('\n');
  }

  if (next === original) return false;
  await fs.writeFile(path, next);
  return true;
}

async function main() {
  const srcFiles = listFiles(`rg --files-with-matches "console\\.log" src --glob "*.ts" --glob "*.tsx"`);
  const fnFiles = listFiles(
    `rg --files-with-matches "console\\.log" functions/src --glob "*.ts" --glob "*.tsx"`,
  );

  const changed = [];

  for (const file of srcFiles) {
    // Never rewrite the logger itself.
    if (file === 'src/utils/logger.ts') continue;
    const did = await rewriteFile(file, {
      importLine: `import { logger } from '@/utils/logger';`,
      replaceFrom: 'console.log',
      replaceTo: 'logger.debug',
      hasImport: hasLoggerImportForWeb,
    });
    if (did) changed.push(file);
  }

  for (const file of fnFiles) {
    const did = await rewriteFile(file, {
      importLine: `import * as logger from 'firebase-functions/logger';`,
      replaceFrom: 'console.log',
      replaceTo: 'logger.debug',
      hasImport: hasLoggerImportForFunctions,
    });
    if (did) changed.push(file);
  }

  process.stdout.write(changed.join('\n') + (changed.length ? '\n' : ''));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

