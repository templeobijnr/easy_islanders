"use strict";
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * UTILS — ERRORS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Typed error classes and helpers for consistent error handling.
 *
 * Invariants:
 * - `AppError` carries a stable `code`.
 * - `isAppError` is safe to use in controllers to map to transport errors.
 * - `getErrorMessage` never throws and never returns secrets.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAppError = exports.AppError = void 0;
exports.getErrorMessage = getErrorMessage;
var AppError = /** @class */ (function (_super) {
    __extends(AppError, _super);
    function AppError(code, message) {
        var _this = _super.call(this, message) || this;
        _this.code = code;
        _this.name = "AppError";
        return _this;
    }
    return AppError;
}(Error));
exports.AppError = AppError;
var isAppError = function (error) {
    return error instanceof AppError;
};
exports.isAppError = isAppError;
/**
 * Best-effort error message extraction.
 * Use for logging and safe user-facing fallbacks.
 */
function getErrorMessage(error) {
    if (error == null)
        return undefined;
    if (typeof error === "string")
        return error;
    if (error instanceof Error)
        return error.message || undefined;
    try {
        // Some libraries throw plain objects with `message`
        var msg = error === null || error === void 0 ? void 0 : error.message;
        return typeof msg === "string" ? msg : undefined;
    }
    catch (_a) {
        return undefined;
    }
}
