/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');

const servicesRoot = path.resolve(__dirname, '../src/services');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

function extractSpecifiers(source) {
  const specifiers = [];

  const importFrom = /from\s+['"]([^'"]+)['"]/g;
  const exportFrom = /export\s+\*\s+from\s+['"]([^'"]+)['"]/g;

  for (const re of [importFrom, exportFrom]) {
    let m;
    // eslint-disable-next-line no-cond-assign
    while ((m = re.exec(source))) specifiers.push(m[1]);
  }

  return specifiers;
}

function resolveImport(fromFile, spec) {
  if (!spec.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), spec);
  return base;
}

function isWithin(candidate, parent) {
  const rel = path.relative(parent, candidate);
  return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function run() {
  const violations = [];

  const integrationsDir = path.join(servicesRoot, 'integrations');
  const domainsDir = path.join(servicesRoot, 'domains');
  const agentsDir = path.join(servicesRoot, 'agent'); // current name in repo
  const agentsDirAlt = path.join(servicesRoot, 'agents');
  const channelsDir = path.join(servicesRoot, 'channels');

  const checkDirs = [];
  if (fs.existsSync(integrationsDir)) checkDirs.push(integrationsDir);
  if (fs.existsSync(domainsDir)) checkDirs.push(domainsDir);
  if (fs.existsSync(channelsDir)) checkDirs.push(channelsDir);
  if (fs.existsSync(agentsDir)) checkDirs.push(agentsDir);
  if (fs.existsSync(agentsDirAlt)) checkDirs.push(agentsDirAlt);

  const files = checkDirs.flatMap((d) =>
    walk(d).filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'))
  );

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const specs = extractSpecifiers(content);

    for (const spec of specs) {
      const resolved = resolveImport(file, spec);
      if (!resolved) continue;

      const targets = [
        resolved,
        `${resolved}.ts`,
        `${resolved}.tsx`,
        path.join(resolved, 'index.ts'),
        path.join(resolved, 'index.tsx'),
      ];
      const existing = targets.find((p) => fs.existsSync(p));
      if (!existing) continue;

      // Determine which layer the current file is in
      const isIntegrations = isWithin(file, integrationsDir);
      const isDomains = fs.existsSync(domainsDir) && isWithin(file, domainsDir);
      const isChannels = isWithin(file, channelsDir);
      const isAgents = isWithin(file, agentsDir) || (fs.existsSync(agentsDirAlt) && isWithin(file, agentsDirAlt));

      // Determine what the import target is
      const importsAgents =
        isWithin(existing, agentsDir) || (fs.existsSync(agentsDirAlt) && isWithin(existing, agentsDirAlt));
      const importsChannels = isWithin(existing, channelsDir);
      const importsDomains = fs.existsSync(domainsDir) && isWithin(existing, domainsDir);

      // Rule 1: integrations/** must not import agents/** or channels/**
      if (isIntegrations && (importsAgents || importsChannels)) {
        violations.push({
          file,
          spec,
          rule: 'integrations/** must not import agents/** or channels/**',
        });
      }

      // Rule 2: domains/** must not import agents/**
      if (isDomains && importsAgents) {
        violations.push({
          file,
          spec,
          rule: 'domains/** must not import agents/**',
        });
      }

      // Rule 3: channels/** must not import agents/**
      if (isChannels && importsAgents) {
        violations.push({
          file,
          spec,
          rule: 'channels/** must not import agents/**',
        });
      }

      // Rule 4: agents/** must not import channels/**
      if (isAgents && importsChannels) {
        violations.push({
          file,
          spec,
          rule: 'agents/** must not import channels/**',
        });
      }

      // Rule 5: agents/** must not import domains/** (keep AI logic separate from business logic)
      if (isAgents && importsDomains) {
        violations.push({
          file,
          spec,
          rule: 'agents/** must not import domains/**',
        });
      }
    }
  }

  if (violations.length) {
    console.error('\nService boundary violations:\n');
    for (const v of violations) {
      console.error(`- ${path.relative(process.cwd(), v.file)} imports "${v.spec}" (${v.rule})`);
    }
    console.error('\nFix: move logic to the correct layer or depend on a lower layer.\n');
    process.exit(1);
  }

  console.log('✅ Service boundary check passed');
}

run();

