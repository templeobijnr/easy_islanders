"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderTemplate = renderTemplate;
function renderTemplate(template, vars) {
    let out = template;
    const withAliases = {};
    for (const [key, value] of Object.entries(vars)) {
        if (value === undefined || value === null)
            continue;
        const str = String(value);
        withAliases[key] = str;
        // snake_case alias for backwards compatibility
        const snake = key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
        withAliases[snake] = str;
    }
    // Replace {key} tokens (letters/numbers/_)
    out = out.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key) => {
        const v = withAliases[key];
        return v !== undefined ? v : _match;
    });
    return out;
}
//# sourceMappingURL=template.js.map