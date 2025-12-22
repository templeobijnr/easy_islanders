import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

function runBoundaries(cwd: string) {
    execFileSync(process.execPath, ['scripts/check-service-boundaries.js'], {
        cwd,
        stdio: 'pipe',
    });
}

describe('check-service-boundaries script', () => {
    const functionsRoot = path.resolve(__dirname, '../..');
    const tmpDir = path.join(functionsRoot, 'src/services/integrations/__tmp_boundary_test__');

    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    it('passes on current tree', () => {
        runBoundaries(functionsRoot);
    });

    it('fails on a known bad import', () => {
        mkdirSync(tmpDir, { recursive: true });
        const badFile = path.join(tmpDir, 'violation.ts');
        writeFileSync(
            badFile,
            "import { processMessage } from '../../agent/orchestrator.service';\nexport const x = processMessage;\n"
        );

        expect(() => runBoundaries(functionsRoot)).toThrow();
    });
});

