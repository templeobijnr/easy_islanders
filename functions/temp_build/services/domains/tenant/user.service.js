"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLiteContext = void 0;
var firebase_1 = require("../../../config/firebase");
/**
 * Returns a trimmed user context for the chat agent:
 * - facts: confirmed attributes (confidence > 0.6)
 * - missing: missingData array
 */
var getLiteContext = function (uid) { return __awaiter(void 0, void 0, void 0, function () {
    var userSnap, userData, name, role, docRef, snap, empty, data, attrs, facts, missing;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, firebase_1.db.collection('users').doc(uid).get()];
            case 1:
                userSnap = _a.sent();
                userData = userSnap.data() || {};
                name = userData.displayName || userData.name || 'Guest';
                role = userData.type || 'user';
                docRef = firebase_1.db.collection('users').doc(uid).collection('system').doc('intelligence');
                return [4 /*yield*/, docRef.get()];
            case 2:
                snap = _a.sent();
                if (!!snap.exists) return [3 /*break*/, 4];
                empty = { attributes: {}, segments: [], missingData: [] };
                return [4 /*yield*/, docRef.set(empty, { merge: true })];
            case 3:
                _a.sent();
                _a.label = 4;
            case 4:
                data = snap.exists ? (snap.data() || {}) : { attributes: {}, segments: [], missingData: [] };
                attrs = data.attributes || {};
                facts = Object.entries(attrs)
                    .filter(function (_a) {
                    var _ = _a[0], val = _a[1];
                    return val && val.confidence > 0.6;
                })
                    .map(function (_a) {
                    var key = _a[0], val = _a[1];
                    return "".concat(key, ": ").concat(val.value);
                });
                missing = Array.isArray(data.missingData) ? data.missingData.slice(0, 3) : [];
                return [2 /*return*/, {
                        name: name,
                        role: role,
                        confirmed_interests: facts.filter(function (f) { return f.toLowerCase().includes('interest') === false; }),
                        missing_info_probe: missing.length ? missing[0] : null,
                        facts: facts,
                        missing: missing
                    }];
        }
    });
}); };
exports.getLiteContext = getLiteContext;
