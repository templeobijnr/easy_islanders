import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';

function listFiles(command) {
  const out = execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
  return out ? out.split('\n').filter(Boolean) : [];
}

async function replaceInFile(path) {
  const original = await fs.readFile(path, 'utf8');

  // Replace: catch (e: any) / catch(e:any) / catch ( error : any )
  const next = original.replace(/catch\s*\(\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*:\s*any\s*\)/g, 'catch ($1: unknown)');

  if (next === original) return false;
  await fs.writeFile(path, next);
  return true;
}

async function main() {
  const files = [
    ...listFiles(
      `rg --files-with-matches "catch\\s*\\(\\s*[A-Za-z_$][A-Za-z0-9_$]*\\s*:\\s*any\\s*\\)" src functions/src -g "*.ts" -g "*.tsx"`,
    ),
  ];

  const changed = [];
  for (const file of files) {
    const did = await replaceInFile(file);
    if (did) changed.push(file);
  }

  process.stdout.write(changed.join('\n') + (changed.length ? '\n' : ''));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
