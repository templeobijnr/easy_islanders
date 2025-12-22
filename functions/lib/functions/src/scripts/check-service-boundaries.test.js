"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
function runBoundaries(cwd) {
    (0, node_child_process_1.execFileSync)(process.execPath, ['scripts/check-service-boundaries.js'], {
        cwd,
        stdio: 'pipe',
    });
}
describe('check-service-boundaries script', () => {
    const functionsRoot = node_path_1.default.resolve(__dirname, '../..');
    const tmpDir = node_path_1.default.join(functionsRoot, 'src/services/integrations/__tmp_boundary_test__');
    afterEach(() => {
        (0, node_fs_1.rmSync)(tmpDir, { recursive: true, force: true });
    });
    it('passes on current tree', () => {
        runBoundaries(functionsRoot);
    });
    it('fails on a known bad import', () => {
        (0, node_fs_1.mkdirSync)(tmpDir, { recursive: true });
        const badFile = node_path_1.default.join(tmpDir, 'violation.ts');
        (0, node_fs_1.writeFileSync)(badFile, "import { processMessage } from '../../agent/orchestrator.service';\nexport const x = processMessage;\n");
        expect(() => runBoundaries(functionsRoot)).toThrow();
    });
});
//# sourceMappingURL=check-service-boundaries.test.js.map