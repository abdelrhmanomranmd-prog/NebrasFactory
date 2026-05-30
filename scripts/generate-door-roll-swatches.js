/**
 * يولّد صور SVG لكل رولّة (N-1..21 بدون 12) — تشغيل: node scripts/generate-door-roll-swatches.js
 */
const fs = require('fs');
const path = require('path');

const ROLLS = [
    { n: 1, hex: '#5c4033' }, { n: 2, hex: '#c4a574' }, { n: 3, hex: '#b8bcc4' },
    { n: 4, hex: '#f0ebe3' }, { n: 5, hex: '#d4c4a8' }, { n: 6, hex: '#a89888' },
    { n: 7, hex: '#3d2817' }, { n: 8, hex: '#a0522d' }, { n: 9, hex: '#9a8f82' },
    { n: 10, hex: '#6b5344' }, { n: 11, hex: '#d9b88c' }, { n: 13, hex: '#1a1a1a' },
    { n: 14, hex: '#5c2424' }, { n: 15, hex: '#5a5e66' }, { n: 16, hex: '#8b6914' },
    { n: 17, hex: '#2c1810' }, { n: 18, hex: '#fafafa' }, { n: 19, hex: '#4a4e54' },
    { n: 20, hex: '#e8e6e3' }, { n: 21, hex: '#b8860b' }
];

function woodSvg(hex, code) {
    const dark = shade(hex, -0.18);
    const light = shade(hex, 0.14);
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">\n' +
        '<defs>\n' +
        '<linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">\n' +
        '<stop offset="0%" stop-color="' + light + '"/>\n' +
        '<stop offset="50%" stop-color="' + hex + '"/>\n' +
        '<stop offset="100%" stop-color="' + dark + '"/>\n' +
        '</linearGradient>\n' +
        '<filter id="grain" x="0" y="0" width="100%" height="100%">\n' +
        '<feTurbulence type="fractalNoise" baseFrequency="0.9 0.04" numOctaves="3" seed="2"/>\n' +
        '<feColorMatrix type="matrix" values="0 0 0 0 0.4  0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0.35 0"/>\n' +
        '<feBlend in="SourceGraphic" mode="multiply"/>\n' +
        '</filter>\n' +
        '</defs>\n' +
        '<rect width="256" height="256" fill="url(#g)" filter="url(#grain)"/>\n' +
        '<g opacity="0.12" stroke="#000" stroke-width="1">\n' +
        [32, 64, 96, 128, 160, 192, 224].map(function(y) {
            return '<line x1="0" y1="' + y + '" x2="256" y2="' + (y + 8) + '"/>';
        }).join('\n') +
        '</g>\n' +
        '<text x="8" y="244" font-family="sans-serif" font-size="14" fill="rgba(0,0,0,0.35)">' + code + '</text>\n' +
        '</svg>\n';
}

function shade(hex, amt) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!m) return hex;
    const ch = [1, 2, 3].map(function(i) {
        let v = parseInt(m[i], 16) / 255;
        if (amt >= 0) v += (1 - v) * amt;
        else v *= 1 + amt;
        return Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0');
    });
    return '#' + ch.join('');
}

const outDir = path.join(__dirname, '..', 'images', 'rolls');
fs.mkdirSync(outDir, { recursive: true });
ROLLS.forEach(function(r) {
    const file = path.join(outDir, 'N-' + r.n + '.svg');
    fs.writeFileSync(file, woodSvg(r.hex, 'N-' + r.n), 'utf8');
    console.log('Wrote', file);
});
