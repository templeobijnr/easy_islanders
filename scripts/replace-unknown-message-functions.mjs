import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const functionsSrcRoot = path.join(repoRoot, 'functions', 'src');
const errorsModule = path.join(functionsSrcRoot, 'utils', 'errors.ts');

const ERROR_NAMES = [
  'error',
  'err',
  'e',
  'toolErr',
  'locErr',
  'textError',
  'extractError',
];

function isTsFile(filePath) {
  return filePath.endsWith('.ts') || filePath.endsWith('.tsx');
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (entry.isFile() && isTsFile(full)) {
      files.push(full);
    }
  }
  return files;
}

function relImport(fromFile) {
  const fromDir = path.dirname(fromFile);
  let rel = path.relative(fromDir, errorsModule).replace(/\\/g, '/');
  rel = rel.replace(/\.ts$/, '');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return rel;
}

function hasImport(content) {
  return /from\s+['"][^'"]*\/utils\/errors['"]/.test(content) || /getErrorMessage/.test(content) && /utils\/errors/.test(content);
}

function insertImport(content, importPath) {
  const lines = content.split('\n');
  let insertAt = 0;
  while (insertAt < lines.length) {
    const line = lines[insertAt].trim();
    if (line.startsWith('import ')) {
      insertAt += 1;
      continue;
    }
    break;
  }
  lines.splice(insertAt, 0, `import { getErrorMessage } from '${importPath}';`);
  return lines.join('\n');
}

function replaceMessages(content) {
  let next = content;
  for (const name of ERROR_NAMES) {
    const opt = new RegExp(`\\b${name}\\s*\\?\\.\\s*message\\b`, 'g');
    const dot = new RegExp(`\\b${name}\\s*\\.\\s*message\\b`, 'g');
    next = next.replace(opt, `getErrorMessage(${name})`);
    next = next.replace(dot, `getErrorMessage(${name})`);
  }
  return next;
}

async function main() {
  const files = await walk(functionsSrcRoot);
  const changed = [];

  for (const file of files) {
    const original = await fs.readFile(file, 'utf8');
    const replaced = replaceMessages(original);
    if (replaced === original) continue;

    let withImport = replaced;
    if (!hasImport(replaced)) {
      withImport = insertImport(replaced, relImport(file));
    }

    if (withImport !== original) {
      await fs.writeFile(file, withImport);
      changed.push(path.relative(repoRoot, file).replace(/\\/g, '/'));
    }
  }

  process.stdout.write(changed.join('\n') + (changed.length ? '\n' : ''));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

