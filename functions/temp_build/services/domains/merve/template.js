"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderTemplate = renderTemplate;
function renderTemplate(template, vars) {
    var out = template;
    var withAliases = {};
    for (var _i = 0, _a = Object.entries(vars); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        if (value === undefined || value === null)
            continue;
        var str = String(value);
        withAliases[key] = str;
        // snake_case alias for backwards compatibility
        var snake = key.replace(/[A-Z]/g, function (m) { return "_".concat(m.toLowerCase()); });
        withAliases[snake] = str;
    }
    // Replace {key} tokens (letters/numbers/_)
    out = out.replace(/\{([a-zA-Z0-9_]+)\}/g, function (_match, key) {
        var v = withAliases[key];
        return v !== undefined ? v : _match;
    });
    return out;
}
