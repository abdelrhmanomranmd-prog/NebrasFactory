/* Node smoke harness for aluminum self-test (hrws212) */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const store = Object.create(null);

const localStorage = {
    getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; }
};

const window = {
    localStorage,
    console,
    document: {
        getElementById() { return null; },
        querySelector() { return null; },
        querySelectorAll() { return []; },
        createElement() {
            return {
                style: {},
                setAttribute() {},
                appendChild() {},
                remove() {},
                click() {}
            };
        },
        body: { appendChild() {} }
    },
    alert() {},
    URL: {
        createObjectURL() { return 'blob:test'; },
        revokeObjectURL() {}
    }
};
window.window = window;
window.globalThis = window;
window.showNebrasAdminToast = function () {};

function runFile(rel) {
    const code = fs.readFileSync(path.join(root, rel), 'utf8');
    vm.runInNewContext(code, window, { filename: rel });
}

runFile('js/nebras-aluminum-cutting.js');
runFile('js/nebras-aluminum-complete.js');

if (typeof window.__nebrasAluSelfTest !== 'function') {
    console.error('FAIL: __nebrasAluSelfTest missing');
    process.exit(2);
}
const report = window.__nebrasAluSelfTest();
console.log(report.summary || JSON.stringify(report, null, 2));
if (report.fails && report.fails.length) {
    report.fails.forEach(function (f) {
        console.error(' -', f.name, f.detail || '');
    });
}
process.exit(report.ok ? 0 : 1);
