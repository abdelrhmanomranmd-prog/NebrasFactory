/**
 * Nebras — معاينة أبواب بطبقات ديناميكية (أسلوب Photoshop) + دوران 360° CSS
 */
(function(global) {
    'use strict';

    const instances = new WeakMap();

    function shadeHex(hex, pct) {
        const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#b8bcc4');
        if (!m) return hex || '#b8bcc4';
        const f = pct >= 0 ? function(v) { return v + (255 - v) * pct; } : function(v) { return v * (1 + pct); };
        return '#' + [1, 2, 3].map(function(i) {
            return Math.round(Math.max(0, Math.min(255, f(parseInt(m[i], 16))))).toString(16).padStart(2, '0');
        }).join('');
    }

    function resolveUrl(path) {
        const t = String(path || '').trim();
        if (!t) return '';
        if (/^(https?:|data:|blob:)/i.test(t)) return t;
        if (t.startsWith('/')) return t.substring(1);
        return t;
    }

    function layerKey(type, model) {
        return (type || 'edge-band') + '|' + (model || 'edge-1');
    }

    function pickBase(manifest, state) {
        const m = manifest || {};
        const bases = m.bases || {};
        const k = layerKey(state.type, state.model);
        if (bases[k]) return resolveUrl(bases[k]);
        if (bases[state.type + '|default']) return resolveUrl(bases[state.type + '|default']);
        if (state.type && bases[state.type]) return resolveUrl(bases[state.type]);
        return resolveUrl(m.defaultBase || 'images/wpc-door-real-base.png');
    }

    function overlayList(state, manifest) {
        const ids = [];
        const map = (manifest && manifest.overlays) || {};
        if (state.outerShape === 'outer-curve' || state.frame === 'curve') ids.push('outer-curve');
        if (state.decor === 'transom' && !state.isSliding) ids.push('transom');
        if (state.isDouble && !state.isSliding) ids.push('double-leaf');
        if (state.isSliding) ids.push('sliding');
        const surface = state.surface || 'flat';
        if (surface === 'u-plain') {
            ids.push('u-channel');
            ids.push('slats');
        } else if (surface === 'u-slats') {
            ids.push('slats');
        } else if (surface === 'u-classic') {
            ids.push('panel-classic');
        } else if (surface === 'u-glass' || surface === 'full-glass') {
            if (state.glassLayout === 'strips-5') ids.push('glass-strips');
            else if (state.glassLayout === 'grid-2x2') ids.push('glass-grid');
            else ids.push('glass-tall');
        }
        return ids.filter(function(id) { return !!map[id]; }).map(function(id) {
            return { id: id, src: resolveUrl(map[id]) };
        });
    }

    class DoorCompositorEngine {
        constructor(container) {
            this.container = container;
            this.stage = null;
            this.layers = {};
            this.rotateY = -18;
            this.rotateX = 4;
            this.autoSpin = true;
            this._raf = 0;
            this._drag = false;
            this._lastX = 0;
            this.zoom = 1;
            this._bound = {};
        }

        mount() {
            if (!this.container || this.stage) return true;
            const self = this;
            this.container.innerHTML =
                '<div class="ndc-scene" data-ndc="scene"></div>' +
                '<div class="ndc-stage-wrap">' +
                '<div class="ndc-stage" data-ndc="stage">' +
                '<img class="ndc-layer ndc-layer--base" data-ndc="base" alt="" decoding="async">' +
                '<div class="ndc-layer ndc-layer--leaf-b" data-ndc="leaf-b"></div>' +
                '<div class="ndc-layer ndc-layer--leaf" data-ndc="leaf"></div>' +
                '<div class="ndc-layer ndc-layer--transom" data-ndc="transom"></div>' +
                '<div class="ndc-overlays" data-ndc="overlays"></div>' +
                '<div class="ndc-layer ndc-layer--shade" data-ndc="shade"></div>' +
                '</div></div>';

            this.stage = this.container.querySelector('[data-ndc="stage"]');
            this.layers.base = this.container.querySelector('[data-ndc="base"]');
            this.layers.leaf = this.container.querySelector('[data-ndc="leaf"]');
            this.layers.leafB = this.container.querySelector('[data-ndc="leaf-b"]');
            this.layers.transom = this.container.querySelector('[data-ndc="transom"]');
            this.layers.overlays = this.container.querySelector('[data-ndc="overlays"]');
            this.layers.shade = this.container.querySelector('[data-ndc="shade"]');
            this.layers.scene = this.container.querySelector('[data-ndc="scene"]');

            this._bound.down = function(e) {
                self._drag = true;
                self.autoSpin = false;
                self._lastX = e.clientX;
                self.container.setPointerCapture(e.pointerId);
            };
            this._bound.up = function() {
                self._drag = false;
                self.autoSpin = true;
            };
            this._bound.move = function(e) {
                if (!self._drag) return;
                self.rotateY += (e.clientX - self._lastX) * 0.45;
                self._lastX = e.clientX;
            };
            this.container.addEventListener('pointerdown', this._bound.down);
            this.container.addEventListener('pointerup', this._bound.up);
            this.container.addEventListener('pointercancel', this._bound.up);
            this.container.addEventListener('pointermove', this._bound.move);

            function tick() {
                self._raf = global.requestAnimationFrame(tick);
                if (self.autoSpin && !self._drag) self.rotateY += 0.28;
                self._applyTransform();
            }
            tick();
            return true;
        }

        _applyTransform() {
            if (!this.stage) return;
            const z = this.zoom || 1;
            this.stage.style.transform =
                'rotateX(' + this.rotateX + 'deg) rotateY(' + this.rotateY + 'deg) scale(' + z + ')';
        }

        _paintLeaf(el, hex, texUrl, maskUrl, visible, offsetX) {
            if (!el) return;
            el.classList.toggle('is-visible', !!visible);
            if (!visible) return;
            const safe = hex || '#b8bcc4';
            const url = texUrl ? 'url("' + texUrl.replace(/"/g, '') + '")' : 'none';
            el.style.backgroundColor = safe;
            el.style.backgroundImage = url;
            el.style.backgroundSize = 'cover';
            el.style.backgroundPosition = 'center';
            if (maskUrl) {
                const m = 'url("' + maskUrl.replace(/"/g, '') + '")';
                el.style.webkitMaskImage = m;
                el.style.maskImage = m;
                el.style.webkitMaskSize = 'contain';
                el.style.maskSize = 'contain';
                el.style.webkitMaskPosition = 'center';
                el.style.maskPosition = 'center';
                el.style.webkitMaskRepeat = 'no-repeat';
                el.style.maskRepeat = 'no-repeat';
            }
            el.style.transform = offsetX ? 'translateX(' + offsetX + '%)' : '';
            el.style.filter = 'contrast(1.06) saturate(1.08)';
        }

        update(payload) {
            payload = payload || {};
            const state = payload.state || {};
            const manifest = payload.manifest || {};
            const hex = (payload.color && payload.color.hex) || '#b8bcc4';
            const texUrl = resolveUrl((payload.color && payload.color.textureUrl) || '');
            const maskUrl = resolveUrl(manifest.leafMask || 'images/wpc-door-leaf-mask.png');

            const baseSrc = pickBase(manifest, state);
            if (this.layers.base) {
                this.layers.base.src = baseSrc;
                this.layers.base.onerror = function() {
                    this.onerror = null;
                    this.style.opacity = '0';
                };
                this.layers.base.style.opacity = '1';
            }

            const showB = (state.isDouble && !state.isSliding) || (state.isSliding && state.isDouble);
            this._paintLeaf(this.layers.leaf, hex, texUrl, maskUrl, true, showB && !state.isSliding ? 8 : 0);
            this._paintLeaf(this.layers.leafB, hex, texUrl, maskUrl, showB && !state.isSliding, -10);
            this._paintLeaf(this.layers.transom, shadeHex(hex, 0.06), texUrl, maskUrl, state.decor === 'transom' && !state.isSliding, 0);

            if (this.layers.overlays) {
                const items = overlayList(state, manifest);
                this.layers.overlays.innerHTML = items.map(function(item, i) {
                    return '<img class="ndc-overlay ndc-overlay--' + item.id + '" src="' + item.src + '" alt="" loading="lazy" style="z-index:' + (10 + i) + '">';
                }).join('');
            }

            if (this.container) {
                this.container.dataset.doorType = state.type || '';
                this.container.dataset.doorModel = state.model || '';
                this.container.classList.toggle('ndc--sliding', !!state.isSliding);
                this.container.classList.toggle('ndc--double', !!state.isDouble);
                this.container.classList.toggle('ndc--curve', state.outerShape === 'outer-curve');
            }
        }

        setZoomPercent(pct) {
            const p = Math.max(70, Math.min(140, Number(pct) || 100));
            this.zoom = p / 100;
            this._applyTransform();
        }

        dispose() {
            if (this._raf) global.cancelAnimationFrame(this._raf);
            const el = this.container;
            if (el) {
                el.removeEventListener('pointerdown', this._bound.down);
                el.removeEventListener('pointerup', this._bound.up);
                el.removeEventListener('pointercancel', this._bound.up);
                el.removeEventListener('pointermove', this._bound.move);
                el.innerHTML = '';
            }
            this.stage = null;
            this.layers = {};
        }
    }

    global.NebrasDoorCompositor = {
        ready: true,
        mount: function(container) {
            if (!container) return false;
            let engine = instances.get(container);
            if (!engine) {
                engine = new DoorCompositorEngine(container);
                instances.set(container, engine);
            }
            return engine.mount();
        },
        update: function(payload) {
            const container = document.getElementById('nebras-door-compositor-viewport');
            if (!container) return;
            let engine = instances.get(container);
            if (!engine || !engine.stage) {
                if (!this.mount(container)) return;
                engine = instances.get(container);
            }
            if (engine) engine.update(payload);
        },
        setZoomPercent: function(pct) {
            const container = document.getElementById('nebras-door-compositor-viewport');
            const engine = container ? instances.get(container) : null;
            if (engine) engine.setZoomPercent(pct);
        },
        dispose: function(container) {
            const el = container || document.getElementById('nebras-door-compositor-viewport');
            if (!el) return;
            const engine = instances.get(el);
            if (engine) {
                engine.dispose();
                instances.delete(el);
            }
        },
        isMounted: function(container) {
            const el = container || document.getElementById('nebras-door-compositor-viewport');
            return !!(el && instances.has(el) && instances.get(el).stage);
        }
    };
})(typeof window !== 'undefined' ? window : this);
