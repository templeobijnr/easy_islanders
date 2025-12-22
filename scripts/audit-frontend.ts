#!/usr/bin/env node
/**
 * Frontend Modularity Audit Script
 * 
 * Enforces:
 * - 300-line hard limit (HARD FAIL)
 * - Cross-domain import violations (HARD FAIL)
 * - Business logic in components (SOFT WARN)
 * 
 * Run: npm run audit:frontend
 * Output: docs/reports/frontend_modularity_report.md
 */

import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const LINE_LIMIT = 300;
const SRC_DIR = path.resolve(process.cwd(), 'src');
const REPORT_PATH = path.resolve(process.cwd(), 'docs/reports/frontend_modularity_report.md');

// Allowed cross-domain imports
const ALLOWED_CROSS_DOMAIN = [
    'components/ui',
    'components/shared',
    'components/layout',
    'features',  // Features are allowed to be imported by pages
    'utils',
    'hooks',
    'services',
    'types',
    'context',
    'config',
    'constants',
];

// Domain folders to enforce (these are isolated domains)
const DOMAIN_FOLDERS = ['pages', 'dashboard', 'components/admin', 'components/consumer', 'components/booking'];

// Business logic patterns (warn only)
const BUSINESS_LOGIC_PATTERNS = [
    /firebase\/firestore/,
    /getFirestore/,
    /\bgetDoc\b/,
    /\bsetDoc\b/,
    /\bupdateDoc\b/,
    /\bcollection\(/,
    /\bdoc\(/,
    /\bfetch\(/,
    /\baxios\./,
    /\buseQuery\(/,
    /\buseMutation\(/,
];

// ─────────────────────────────────────────────────────────────────────────────
// FILE SCANNER
// ─────────────────────────────────────────────────────────────────────────────

interface FileInfo {
    path: string;
    relativePath: string;
    lines: number;
    isComponent: boolean;
    domain: string | null;
}

interface Violation {
    file: string;
    issue: string;
    severity: 'HARD' | 'SOFT';
}

function getAllFiles(dir: string, files: string[] = []): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === 'test' || entry.name === '__tests__') {
                continue;
            }
            getAllFiles(fullPath, files);
        } else if (entry.isFile()) {
            if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
                // Skip test and story files
                if (entry.name.includes('.test.') || entry.name.includes('.spec.') || entry.name.includes('.stories.')) {
                    continue;
                }
                files.push(fullPath);
            }
        }
    }

    return files;
}

function countLines(filePath: string): number {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split('\n').length;
}

function isReactComponent(filePath: string): boolean {
    if (!filePath.endsWith('.tsx')) {
        return false;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return /export\s+(default\s+)?function\s+\w+/.test(content) ||
        /export\s+(const|let)\s+\w+\s*[=:]\s*(\(|React\.FC)/.test(content);
}

function getDomain(filePath: string): string | null {
    const relative = path.relative(SRC_DIR, filePath);

    // features/domain/*
    const featuresMatch = relative.match(/^features\/([^/]+)/);
    if (featuresMatch) {
        return `features/${featuresMatch[1]}`;
    }

    // pages/domain/*
    const pagesMatch = relative.match(/^pages\/([^/]+)/);
    if (pagesMatch) {
        return `pages/${pagesMatch[1]}`;
    }

    // dashboard/*
    if (relative.startsWith('dashboard/')) {
        return 'dashboard';
    }

    // components/admin/*, components/consumer/*, etc.
    const componentsMatch = relative.match(/^components\/([^/]+)/);
    if (componentsMatch && !['ui', 'shared', 'layout'].includes(componentsMatch[1])) {
        return `components/${componentsMatch[1]}`;
    }

    return null;
}

function getImports(filePath: string): string[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const imports: string[] = [];

    const importRegex = /import\s+(?:[^;]+)\s+from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1]);
    }

    return imports;
}

function checkCrossDomainViolation(filePath: string, fileDomain: string): string[] {
    const violations: string[] = [];
    const imports = getImports(filePath);

    for (const imp of imports) {
        // Skip external packages
        if (!imp.startsWith('.') && !imp.startsWith('@/') && !imp.startsWith('src/')) {
            continue;
        }

        // Resolve relative import
        let resolvedPath: string;
        if (imp.startsWith('.')) {
            resolvedPath = path.relative(SRC_DIR, path.resolve(path.dirname(filePath), imp));
        } else if (imp.startsWith('@/')) {
            resolvedPath = imp.replace('@/', '');
        } else if (imp.startsWith('src/')) {
            resolvedPath = imp.replace('src/', '');
        } else {
            continue;
        }

        // Check if import is to another domain
        for (const domainFolder of DOMAIN_FOLDERS) {
            if (resolvedPath.startsWith(domainFolder + '/')) {
                // Extract domain from import
                let importDomain: string | null = null;

                if (resolvedPath.startsWith('features/')) {
                    const match = resolvedPath.match(/^features\/([^/]+)/);
                    if (match) importDomain = `features/${match[1]}`;
                } else if (resolvedPath.startsWith('pages/')) {
                    const match = resolvedPath.match(/^pages\/([^/]+)/);
                    if (match) importDomain = `pages/${match[1]}`;
                } else if (resolvedPath.startsWith('dashboard/')) {
                    importDomain = 'dashboard';
                } else if (resolvedPath.startsWith('components/')) {
                    const match = resolvedPath.match(/^components\/([^/]+)/);
                    if (match && !['ui', 'shared', 'layout'].includes(match[1])) {
                        importDomain = `components/${match[1]}`;
                    }
                }

                if (importDomain && importDomain !== fileDomain) {
                    violations.push(`Imports from ${importDomain}: ${imp}`);
                }
            }
        }
    }

    return violations;
}

function checkBusinessLogic(filePath: string): boolean {
    if (!filePath.endsWith('.tsx')) {
        return false;
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    for (const pattern of BUSINESS_LOGIC_PATTERNS) {
        if (pattern.test(content)) {
            return true;
        }
    }

    return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

function main() {
    console.log('🔍 Frontend Modularity Audit\n');

    if (!fs.existsSync(SRC_DIR)) {
        console.error('❌ src/ directory not found');
        process.exit(1);
    }

    const files = getAllFiles(SRC_DIR);
    const fileInfos: FileInfo[] = [];
    const violations: Violation[] = [];

    let componentCount = 0;
    let functionalCount = 0;

    // Analyze each file
    for (const filePath of files) {
        const relativePath = path.relative(SRC_DIR, filePath);
        const lines = countLines(filePath);
        const isComponent = isReactComponent(filePath);
        const domain = getDomain(filePath);

        fileInfos.push({
            path: filePath,
            relativePath,
            lines,
            isComponent,
            domain,
        });

        if (isComponent) {
            componentCount++;
            functionalCount++; // Assume functional (class components are rare)
        }

        // Check line limit
        if (lines > LINE_LIMIT) {
            violations.push({
                file: relativePath,
                issue: `Exceeds ${LINE_LIMIT}-line limit: ${lines} lines`,
                severity: 'HARD',
            });
        }

        // Check cross-domain imports
        if (domain) {
            const crossDomainViolations = checkCrossDomainViolation(filePath, domain);
            for (const violation of crossDomainViolations) {
                violations.push({
                    file: relativePath,
                    issue: `Cross-domain import: ${violation}`,
                    severity: 'HARD',
                });
            }
        }

        // Check business logic
        if (isComponent && checkBusinessLogic(filePath)) {
            violations.push({
                file: relativePath,
                issue: 'Contains business logic patterns (Firestore/fetch/etc)',
                severity: 'SOFT',
            });
        }
    }

    // Sort files by line count
    const sortedByLines = [...fileInfos].sort((a, b) => b.lines - a.lines);
    const top20 = sortedByLines.slice(0, 20);
    const filesOverLimit = sortedByLines.filter(f => f.lines > LINE_LIMIT);

    const hardViolations = violations.filter(v => v.severity === 'HARD');
    const softViolations = violations.filter(v => v.severity === 'SOFT');

    // Generate report
    const report = generateReport({
        top20,
        filesOverLimit,
        hardViolations,
        softViolations,
        componentCount,
        functionalCount,
        totalFiles: files.length,
    });

    // Ensure reports directory exists
    const reportsDir = path.dirname(REPORT_PATH);
    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(REPORT_PATH, report);
    console.log(`📄 Report written to: ${REPORT_PATH}\n`);

    // Summary
    console.log('📊 Summary:');
    console.log(`   Total files scanned: ${files.length}`);
    console.log(`   React components: ${componentCount}`);
    console.log(`   Files over ${LINE_LIMIT} lines: ${filesOverLimit.length}`);
    console.log(`   Hard violations: ${hardViolations.length}`);
    console.log(`   Soft warnings: ${softViolations.length}`);
    console.log();

    if (hardViolations.length > 0) {
        console.log('❌ HARD VIOLATIONS (must fix):\n');
        for (const v of hardViolations.slice(0, 10)) {
            console.log(`   ${v.file}: ${v.issue}`);
        }
        if (hardViolations.length > 10) {
            console.log(`   ... and ${hardViolations.length - 10} more`);
        }
        console.log();
        process.exit(1);
    }

    console.log('✅ No hard violations found\n');
    process.exit(0);
}

function generateReport(data: {
    top20: FileInfo[];
    filesOverLimit: FileInfo[];
    hardViolations: Violation[];
    softViolations: Violation[];
    componentCount: number;
    functionalCount: number;
    totalFiles: number;
}): string {
    const now = new Date().toISOString().split('T')[0];

    let report = `# Frontend Modularity Report

Generated: ${now}

## Summary

| Metric | Value |
|--------|-------|
| Total files scanned | ${data.totalFiles} |
| React components | ${data.componentCount} |
| Files over 300 lines | ${data.filesOverLimit.length} |
| Hard violations | ${data.hardViolations.length} |
| Soft warnings | ${data.softViolations.length} |

---

## Top 20 Largest Files

| # | File | Lines |
|---|------|-------|
${data.top20.map((f, i) => `| ${i + 1} | ${f.relativePath} | ${f.lines} |`).join('\n')}

---

## Files Exceeding 300-Line Limit

${data.filesOverLimit.length === 0 ? '_None_' : ''}

${data.filesOverLimit.map(f => `### ${f.relativePath} (${f.lines} lines)

**Recommended splits:**
- Extract hooks to \`${path.dirname(f.relativePath)}/hooks/\`
- Extract sub-components to \`${path.dirname(f.relativePath)}/components/\`
- Extract types to \`${path.dirname(f.relativePath)}/types.ts\`
`).join('\n')}

---

## Hard Violations

${data.hardViolations.length === 0 ? '_None_' : data.hardViolations.map(v => `- **${v.file}**: ${v.issue}`).join('\n')}

---

## Soft Warnings (Business Logic in Components)

${data.softViolations.length === 0 ? '_None_' : data.softViolations.map(v => `- ${v.file}`).join('\n')}

---

## Domain Migration Plan

1. **Connect** — \`pages/connect/*\`, \`components/admin/ConnectManager/*\` → \`features/connect/\`
2. **Bookings** — \`components/booking/*\` → \`features/bookings/\`
3. **Requests** — Request components → \`features/requests/\`
4. **Catalog** — \`components/admin/CatalogManager/*\` → \`features/catalog/\`
5. **Admin** — Remaining admin components → \`features/admin/\`

---

## Next Steps

1. Fix all files exceeding 300-line limit
2. Resolve cross-domain import violations
3. Migrate one domain at a time (start with Connect)
4. Move business logic from components to hooks/services
`;

    return report;
}

main();
