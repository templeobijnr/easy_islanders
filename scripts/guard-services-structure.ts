#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SERVICE LAYER STRUCTURE GUARD
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This script enforces the frozen service layer structure.
 * Run in CI to prevent structural drift.
 *
 * Usage:
 *   npx tsx scripts/guard-services-structure.ts
 *   npm run guard:services
 *
 * Exit codes:
 *   0 = All checks passed
 *   1 = Structural violation detected
 * ═══════════════════════════════════════════════════════════════════════════
 */

import * as fs from 'fs';
import * as path from 'path';

const SERVICES_ROOT = path.join(process.cwd(), 'src/services');

// ═══════════════════════════════════════════════════════════════════════════
// ALLOWED FILES AT ROOT (shims and documentation only)
// ═══════════════════════════════════════════════════════════════════════════

const ALLOWED_ROOT_FILES = new Set([
    // Documentation
    'SERVICES.md',
    'DEFERRED.md',
    'README.md',
    'SERVICE_LAYER_HANDOFF.md',

    // Shims (backward compatibility - DO NOT ADD NEW ONES)
    'firebaseConfig.ts',
    'asyncProcessor.ts',
    'catalogMappers.ts',

    // Legacy services (to be moved in future phases - see DEFERRED.md)
    'connectService.ts',
    'connectService.test.ts',
    'discoverConfigService.ts',
    'discoverConfigService.test.ts',
    'unifiedListingsService.ts',
    'unifiedListingsService.test.ts',
    'catalogMappers.test.ts',
]);

// ═══════════════════════════════════════════════════════════════════════════
// ALLOWED DIRECTORIES
// ═══════════════════════════════════════════════════════════════════════════

const ALLOWED_ROOT_DIRS = new Set([
    'architecture',
    'domains',
    'infrastructure',
    'integrations',
    'storage',
    'utils',
]);

// ═══════════════════════════════════════════════════════════════════════════
// CHECKS
// ═══════════════════════════════════════════════════════════════════════════

interface Violation {
    type: 'unexpected_file' | 'unexpected_dir' | 'missing_header' | 'missing_test';
    path: string;
    message: string;
}

const violations: Violation[] = [];

function checkRootFiles(): void {
    const entries = fs.readdirSync(SERVICES_ROOT, { withFileTypes: true });

    for (const entry of entries) {
        if (entry.isFile()) {
            if (!ALLOWED_ROOT_FILES.has(entry.name)) {
                violations.push({
                    type: 'unexpected_file',
                    path: entry.name,
                    message: `Unexpected file at services root: ${entry.name}. New services must be placed in the appropriate subdirectory (domains/, infrastructure/, integrations/, utils/).`,
                });
            }
        } else if (entry.isDirectory()) {
            if (!ALLOWED_ROOT_DIRS.has(entry.name)) {
                violations.push({
                    type: 'unexpected_dir',
                    path: entry.name,
                    message: `Unexpected directory at services root: ${entry.name}. Only allowed directories: ${[...ALLOWED_ROOT_DIRS].join(', ')}.`,
                });
            }
        }
    }
}

function checkServiceFile(filePath: string): void {
    // Skip non-service files
    if (!filePath.endsWith('.service.ts') && !filePath.endsWith('.client.ts')) {
        return;
    }

    // Skip test files
    if (filePath.includes('.test.') || filePath.includes('.spec.')) {
        return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(SERVICES_ROOT, filePath);

    // Check for architectural header
    const hasContractHeader =
        content.includes('OWNS') ||
        content.includes('ARCHITECTURAL CONTRACT') ||
        content.includes('Layer:') ||
        content.includes('Purpose:');

    if (!hasContractHeader) {
        violations.push({
            type: 'missing_header',
            path: relativePath,
            message: `Service file missing contract header: ${relativePath}. All services must declare OWNS, DOES NOT OWN, and Layer.`,
        });
    }

    // Check for corresponding test file
    const testPath = filePath.replace('.ts', '.test.ts');
    if (!fs.existsSync(testPath)) {
        violations.push({
            type: 'missing_test',
            path: relativePath,
            message: `Service file missing tests: ${relativePath}. All services require test-first development.`,
        });
    }
}

function walkDirectory(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            walkDirectory(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
            checkServiceFile(fullPath);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════');
console.log('  SERVICE LAYER STRUCTURE GUARD');
console.log('═══════════════════════════════════════════════════════════════\n');

// Run checks
checkRootFiles();

// Check service files in subdirectories
for (const dir of ALLOWED_ROOT_DIRS) {
    const dirPath = path.join(SERVICES_ROOT, dir);
    if (fs.existsSync(dirPath)) {
        walkDirectory(dirPath);
    }
}

// Report results
if (violations.length === 0) {
    console.log('✅ All structure checks passed.\n');
    console.log('   - Root files: OK');
    console.log('   - Root directories: OK');
    console.log('   - Service headers: OK');
    console.log('   - Service tests: OK\n');
    process.exit(0);
} else {
    console.error(`❌ ${violations.length} violation(s) detected:\n`);

    for (const v of violations) {
        console.error(`  [${v.type.toUpperCase()}] ${v.path}`);
        console.error(`    → ${v.message}\n`);
    }

    console.error('═══════════════════════════════════════════════════════════════');
    console.error('  HOW TO FIX:');
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('  1. Move new services to the correct subdirectory');
    console.error('  2. Add an architectural contract header');
    console.error('  3. Create corresponding test file');
    console.error('  4. Update SERVICES.md');
    console.error('  5. See SERVICE_LAYER_HANDOFF.md for guidelines\n');

    process.exit(1);
}
