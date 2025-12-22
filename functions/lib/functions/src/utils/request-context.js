"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runWithRequestContext = runWithRequestContext;
exports.getRequestContext = getRequestContext;
exports.setRequestContext = setRequestContext;
exports.getOrCreateRequestId = getOrCreateRequestId;
const node_async_hooks_1 = require("node:async_hooks");
const node_crypto_1 = require("node:crypto");
const storage = new node_async_hooks_1.AsyncLocalStorage();
function runWithRequestContext(values, fn) {
    return storage.run(values, fn);
}
function getRequestContext() {
    var _a;
    return (_a = storage.getStore()) !== null && _a !== void 0 ? _a : {};
}
function setRequestContext(values) {
    const store = storage.getStore();
    if (!store)
        return;
    Object.assign(store, values);
}
function getOrCreateRequestId(maybeRequestId) {
    const trimmed = (maybeRequestId || '').trim();
    if (trimmed)
        return trimmed;
    return (0, node_crypto_1.randomUUID)();
}
//# sourceMappingURL=request-context.js.map