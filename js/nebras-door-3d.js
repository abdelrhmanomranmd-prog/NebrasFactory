/**
 * Nebras — محرك 3D لمصمم الأبواب (يعمل مع file:// و Vercel — بدون ES modules)
 * يتطلب: three.min.js + OrbitControls.js قبل هذا الملف
 */
(function(global) {
    'use strict';

    const THREE = global.THREE;
    const OrbitControlsCtor = THREE && (THREE.OrbitControls || global.OrbitControls);

    /** تحكم دوران 360° بدون OrbitControls (يعمل مع three.min.js المحلي فقط) */
    class NebrasSimpleOrbit {
        constructor(camera, domElement, target) {
            this.camera = camera;
            this.domElement = domElement;
            this.target = target || new THREE.Vector3(0, 1.12, 0.02);
            this.spherical = new THREE.Spherical();
            this.spherical.setFromVector3(camera.position.clone().sub(this.target));
            this.autoRotate = true;
            this.autoRotateSpeed = 1.15;
            this.enableDamping = true;
            this.dampingFactor = 0.08;
            this.minDistance = 1.6;
            this.maxDistance = 6;
            this.minPolarAngle = 0.4;
            this.maxPolarAngle = Math.PI * 0.48;
            this._dragging = false;
            this._lastX = 0;
            this._lastY = 0;
            this._vTheta = 0;
            this._vPhi = 0;
            const self = this;
            this._onDown = function(e) {
                self._dragging = true;
                self.autoRotate = false;
                self._lastX = e.clientX;
                self._lastY = e.clientY;
                domElement.setPointerCapture(e.pointerId);
            };
            this._onUp = function() {
                self._dragging = false;
                self.autoRotate = true;
            };
            this._onMove = function(e) {
                if (!self._dragging) return;
                const dx = e.clientX - self._lastX;
                const dy = e.clientY - self._lastY;
                self._lastX = e.clientX;
                self._lastY = e.clientY;
                self._vTheta -= dx * 0.006;
                self._vPhi -= dy * 0.004;
            };
            this._onWheel = function(e) {
                e.preventDefault();
                self.spherical.radius += e.deltaY * 0.004;
                self.spherical.radius = Math.max(self.minDistance, Math.min(self.maxDistance, self.spherical.radius));
            };
            domElement.addEventListener('pointerdown', this._onDown);
            domElement.addEventListener('pointerup', this._onUp);
            domElement.addEventListener('pointercancel', this._onUp);
            domElement.addEventListener('pointermove', this._onMove);
            domElement.addEventListener('wheel', this._onWheel, { passive: false });
        }

        update() {
            if (this.autoRotate && !this._dragging) {
                this.spherical.theta += 0.011 * this.autoRotateSpeed;
            }
            if (this.enableDamping) {
                this.spherical.theta += this._vTheta;
                this.spherical.phi += this._vPhi;
                this._vTheta *= 1 - this.dampingFactor;
                this._vPhi *= 1 - this.dampingFactor;
            }
            this.spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this.spherical.phi));
            this.spherical.makeSafe();
            this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius));
            const pos = new THREE.Vector3().setFromSpherical(this.spherical).add(this.target);
            this.camera.position.copy(pos);
            this.camera.lookAt(this.target);
        }

        dispose() {
            const el = this.domElement;
            if (!el) return;
            el.removeEventListener('pointerdown', this._onDown);
            el.removeEventListener('pointerup', this._onUp);
            el.removeEventListener('pointercancel', this._onUp);
            el.removeEventListener('pointermove', this._onMove);
            el.removeEventListener('wheel', this._onWheel);
        }
    }

    function createOrbitControls(camera, domElement) {
        const target = new THREE.Vector3(0, 1.12, 0.02);
        if (OrbitControlsCtor) {
            const c = new OrbitControlsCtor(camera, domElement);
            c.enableDamping = true;
            c.dampingFactor = 0.07;
            c.minDistance = 1.6;
            c.maxDistance = 6;
            c.maxPolarAngle = Math.PI * 0.48;
            c.minPolarAngle = 0.4;
            c.target = target;
            if (c.autoRotate !== undefined) {
                c.autoRotate = true;
                c.autoRotateSpeed = 1.15;
            }
            c.update();
            return c;
        }
        return new NebrasSimpleOrbit(camera, domElement, target);
    }

    const instances = new WeakMap();
    const textureCache = new Map();

    function stubApi(message) {
        return {
            ready: false,
            error: message || 'Three.js غير محمّل',
            mount: function(container) {
                if (container) {
                    container.innerHTML = '<p class="nebras-door-3d-error"><i class="fas fa-triangle-exclamation"></i> ' +
                        (message || 'تعذّر تحميل محرك 3D. افتحي الموقع عبر خادم محلي (Live Server) أو بعد النشر على Vercel.') + '</p>';
                }
                return false;
            },
            update: function() {},
            setZoomPercent: function() {},
            dispose: function(container) {
                if (container) container.innerHTML = '';
            },
            isMounted: function() { return false; }
        };
    }

    if (!THREE) {
        global.NebrasDoor3D = stubApi('مكتبة Three.js لم تُحمَّل — أعدي تحميل الصفحة (Ctrl+F5) أو افتحي الموقع عبر خادم محلي.');
        return;
    }

    function parseHex(hex) {
        const c = new THREE.Color();
        try {
            c.set(hex || '#b8bcc4');
        } catch (e) {
            c.set('#b8bcc4');
        }
        return c;
    }

    function shadeColor(base, amount) {
        const c = base.clone();
        if (amount >= 0) {
            c.r += (1 - c.r) * amount;
            c.g += (1 - c.g) * amount;
            c.b += (1 - c.b) * amount;
        } else {
            const f = 1 + amount;
            c.r *= f;
            c.g *= f;
            c.b *= f;
        }
        return c;
    }

    function applyTexColorSpace(tex) {
        if (!tex) return tex;
        if ('colorSpace' in tex && THREE.SRGBColorSpace) {
            tex.colorSpace = THREE.SRGBColorSpace;
        } else if (THREE.sRGBEncoding) {
            tex.encoding = THREE.sRGBEncoding;
        }
        return tex;
    }

    function loadTexture(url) {
        const key = String(url || '').trim();
        if (!key) return Promise.resolve(null);
        if (textureCache.has(key)) {
            const cached = textureCache.get(key);
            return cached instanceof Promise ? cached : Promise.resolve(cached);
        }
        const promise = new Promise(function(resolve) {
            const loader = new THREE.TextureLoader();
            loader.load(
                key,
                function(tex) {
                    applyTexColorSpace(tex);
                    tex.wrapS = THREE.RepeatWrapping;
                    tex.wrapT = THREE.RepeatWrapping;
                    tex.repeat.set(2, 2);
                    textureCache.set(key, tex);
                    resolve(tex);
                },
                undefined,
                function() {
                    textureCache.set(key, null);
                    resolve(null);
                }
            );
        });
        textureCache.set(key, promise);
        return promise;
    }

    function makeWpcMaterial(color, map, opts) {
        opts = opts || {};
        const c = color && color.isColor ? color.clone() : parseHex(color);
        const lum = c.r * 0.299 + c.g * 0.587 + c.b * 0.114;
        if (lum > 0.78) c.multiplyScalar(0.86);
        const mat = new THREE.MeshStandardMaterial({
            color: c,
            map: map || null,
            roughness: opts.roughness != null ? opts.roughness : 0.58,
            metalness: opts.metalness != null ? opts.metalness : 0.05
        });
        if (map) mat.color.multiplyScalar(0.9);
        return mat;
    }

    function makeGlassMaterial() {
        return new THREE.MeshStandardMaterial({
            color: 0xc8dce8,
            roughness: 0.05,
            metalness: 0.1,
            transparent: true,
            opacity: 0.72
        });
    }

    function makeMetalMaterial(tint) {
        return new THREE.MeshStandardMaterial({
            color: tint || 0x8a929a,
            roughness: 0.32,
            metalness: 0.88
        });
    }

    class NebrasDoor3DEngine {
        constructor(container) {
            this.container = container;
            this.scene = null;
            this.camera = null;
            this.renderer = null;
            this.controls = null;
            this.doorRoot = null;
            this.parts = {};
            this.materials = {};
            this._raf = 0;
            this._resizeObs = null;
            this.baseZoom = 3.1;
            this.zoomFactor = 1;
        }

        mount() {
            if (!this.container || this.renderer) return true;
            const self = this;
            const w = Math.max(this.container.clientWidth, 320);
            const h = Math.max(this.container.clientHeight, 420);

            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0xe8eaed);
            this.scene.fog = new THREE.Fog(0xe8eaed, 7, 16);

            this.camera = new THREE.PerspectiveCamera(46, w / h, 0.1, 40);
            this.camera.position.set(2.05, 1.28, 2.95);

            try {
                this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
            } catch (webglErr) {
                this.container.innerHTML = '<p class="nebras-door-3d-error">المتصفح لا يدعم WebGL لعرض 3D.</p>';
                return false;
            }
            this.renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
            this.renderer.setSize(w, h);
            if ('outputColorSpace' in this.renderer && THREE.SRGBColorSpace) {
                this.renderer.outputColorSpace = THREE.SRGBColorSpace;
            } else if (THREE.sRGBEncoding) {
                this.renderer.outputEncoding = THREE.sRGBEncoding;
            }
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.container.innerHTML = '';
            this.container.appendChild(this.renderer.domElement);

            this.scene.add(new THREE.AmbientLight(0xffffff, 0.62));
            const key = new THREE.DirectionalLight(0xffffff, 1.1);
            key.position.set(4, 6, 5);
            key.castShadow = true;
            this.scene.add(key);
            const fill = new THREE.DirectionalLight(0xb8c8d8, 0.5);
            fill.position.set(-3, 3, -2);
            this.scene.add(fill);

            const floor = new THREE.Mesh(
                new THREE.PlaneGeometry(10, 10),
                new THREE.MeshStandardMaterial({ color: 0xd0d4da, roughness: 0.9 })
            );
            floor.rotation.x = -Math.PI / 2;
            floor.receiveShadow = true;
            this.scene.add(floor);

            const wall = new THREE.Mesh(
                new THREE.PlaneGeometry(10, 5),
                new THREE.MeshStandardMaterial({ color: 0xf0f2f5, roughness: 1 })
            );
            wall.position.set(0, 2.5, -1.8);
            wall.receiveShadow = true;
            this.scene.add(wall);

            this.doorRoot = new THREE.Group();
            this.doorRoot.position.y = 1.18;
            this.scene.add(this.doorRoot);
            this._buildDoorMeshes();

            this.controls = createOrbitControls(this.camera, this.renderer.domElement);
            if (this.controls.addEventListener) {
                this.controls.addEventListener('start', function() {
                    if (self.controls) self.controls.autoRotate = false;
                });
                this.controls.addEventListener('end', function() {
                    if (self.controls) self.controls.autoRotate = true;
                });
            }

            function loop() {
                self._raf = global.requestAnimationFrame(loop);
                if (self.controls) self.controls.update();
                if (self.renderer && self.scene && self.camera) {
                    self.renderer.render(self.scene, self.camera);
                }
            }
            loop();

            if (global.ResizeObserver) {
                this._resizeObs = new ResizeObserver(function() { self._onResize(); });
                this._resizeObs.observe(this.container);
            }
            return true;
        }

        _onResize() {
            if (!this.container || !this.renderer || !this.camera) return;
            const w = Math.max(this.container.clientWidth, 1);
            const h = Math.max(this.container.clientHeight, 1);
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
        }

        _buildDoorMeshes() {
            const root = this.doorRoot;
            const p = {};

            p.frameOuter = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.44, 0.14), makeWpcMaterial(0x6a727a));
            p.frameOuter.castShadow = true;
            root.add(p.frameOuter);

            p.frameLiner = new THREE.Mesh(new THREE.BoxGeometry(0.96, 2.26, 0.07), makeWpcMaterial(0x4a5056));
            p.frameLiner.position.z = 0.05;
            root.add(p.frameLiner);

            p.threshold = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 0.16), makeMetalMaterial(0x3a4046));
            p.threshold.position.set(0, -1.22, 0.03);
            root.add(p.threshold);

            p.transom = new THREE.Group();
            p.transomPanel = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.24, 0.05), makeWpcMaterial(0x9aa0a8));
            p.transomPanel.position.set(0, 1.06, 0.07);
            p.transomGlass = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 0.025), makeGlassMaterial());
            p.transomGlass.position.set(0, 1.06, 0.095);
            p.transom.add(p.transomPanel, p.transomGlass);
            p.transom.visible = false;
            root.add(p.transom);

            p.leafA = new THREE.Group();
            p.leafABody = new THREE.Mesh(new THREE.BoxGeometry(0.82, 2.0, 0.055), makeWpcMaterial(0xb8bcc4));
            p.leafABody.castShadow = true;
            p.leafABody.position.set(0, 0, 0.075);
            p.leafA.add(p.leafABody);

            p.leafPanelInset = new THREE.Mesh(
                new THREE.BoxGeometry(0.74, 1.82, 0.008),
                new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.9, transparent: true, opacity: 0.06 })
            );
            p.leafPanelInset.position.set(0, 0, 0.108);
            p.leafA.add(p.leafPanelInset);

            p.leafADetails = new THREE.Group();
            p.leafA.add(p.leafADetails);

            p.glassGroup = new THREE.Group();
            p.leafA.add(p.glassGroup);

            p.leafB = new THREE.Group();
            p.leafBBody = new THREE.Mesh(new THREE.BoxGeometry(0.38, 2.0, 0.055), makeWpcMaterial(0xb8bcc4));
            p.leafBBody.castShadow = true;
            p.leafBBody.position.set(-0.2, 0, 0.075);
            p.leafB.add(p.leafBBody);
            p.leafB.visible = false;
            root.add(p.leafB);
            root.add(p.leafA);

            p.slidingTrack = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.035, 0.09), makeMetalMaterial(0x5a6066));
            p.slidingTrack.position.set(0, 1.14, 0.03);
            p.slidingTrack.visible = false;
            root.add(p.slidingTrack);

            p.hinges = new THREE.Group();
            [-0.62, 0, 0.62].forEach(function(y) {
                const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.11, 0.07), makeMetalMaterial(0x9aa0a8));
                hinge.position.set(-0.46, y, 0.09);
                p.hinges.add(hinge);
            });
            root.add(p.hinges);

            p.handle = new THREE.Group();
            const handleBar = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.15, 0.035), makeMetalMaterial(0x2a2a2a));
            handleBar.position.set(0.34, 0, 0.11);
            const handleLever = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.028, 0.028), makeMetalMaterial(0x333333));
            handleLever.position.set(0.3, 0, 0.11);
            p.handle.add(handleBar, handleLever);
            p.leafA.add(p.handle);

            p.pullHandle = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.17, 0.045), makeMetalMaterial(0xb8c0c8));
            p.pullHandle.position.set(0.34, 0, 0.11);
            p.pullHandle.visible = false;
            p.leafA.add(p.pullHandle);

            this.parts = p;
            this.materials.leaf = p.leafABody.material;
        }

        _clearLeafDetails() {
            const g = this.parts.leafADetails;
            const glass = this.parts.glassGroup;
            if (!g || !glass) return;
            [g, glass].forEach(function(group) {
                while (group.children.length) {
                    const ch = group.children[0];
                    group.remove(ch);
                    if (ch.geometry) ch.geometry.dispose();
                    if (ch.material) ch.material.dispose();
                }
            });
        }

        _addGrooves(count, depth) {
            const g = this.parts.leafADetails;
            const mat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95, transparent: true, opacity: 0.16 });
            for (let i = 0; i < count; i++) {
                const y = -0.52 + (i + 1) * (1.04 / (count + 1));
                const groove = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.014, depth || 0.01), mat);
                groove.position.set(0, y, 0.11);
                g.add(groove);
            }
        }

        _addUChannels() {
            const g = this.parts.leafADetails;
            const mat = new THREE.MeshStandardMaterial({ color: 0x111111, transparent: true, opacity: 0.2 });
            [-0.27, 0.27].forEach(function(x) {
                const ch = new THREE.Mesh(new THREE.BoxGeometry(0.014, 1.65, 0.012), mat);
                ch.position.set(x, 0, 0.112);
                g.add(ch);
            });
        }

        _addGlassPane(w, h, x, y) {
            const pane = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.022), makeGlassMaterial());
            pane.position.set(x, y, 0.11);
            this.parts.glassGroup.add(pane);
        }

        async update(payload) {
            payload = payload || {};
            const state = payload.state || {};
            const hex = (payload.color && payload.color.hex) || '#b8bcc4';
            const texUrl = (payload.color && payload.color.textureUrl) || '';
            const base = parseHex(hex);

            const map = await loadTexture(texUrl);
            const leafMat = makeWpcMaterial(base, map);
            const frameMat = makeWpcMaterial(shadeColor(base, -0.22), map, { roughness: 0.72 });
            const linerMat = makeWpcMaterial(shadeColor(base, -0.34), map, { roughness: 0.78 });

            this.parts.leafABody.material = leafMat;
            this.parts.leafBBody.material = leafMat.clone();
            this.parts.frameOuter.material = frameMat;
            this.parts.frameLiner.material = linerMat;
            this.parts.transomPanel.material = makeWpcMaterial(shadeColor(base, 0.04), map);

            this._clearLeafDetails();

            const surface = state.surface || 'flat';
            const isDouble = !!state.isDouble;
            const isSliding = !!state.isSliding;
            const decor = state.decor || 'plain';
            const glassLayout = state.glassLayout || 'strip-tall';
            const opening = state.opening || 'right';
            const hardware = state.hardware || 'lever-black';
            const outerShape = state.outerShape || state.frame || 'outer-flat';

            if (outerShape === 'outer-curve' || outerShape === 'curve') {
                this._addGrooves(5, 0.012);
            }

            if (surface === 'u-plain') {
                this._addUChannels();
                this._addGrooves(3);
            } else if (surface === 'u-slats') {
                this._addGrooves(12, 0.008);
            } else if (surface === 'u-classic') {
                this._addGrooves(4);
            }

            if (surface === 'u-glass' || surface === 'full-glass') {
                if (glassLayout === 'strips-5') {
                    [-0.5, -0.25, 0, 0.25, 0.5].forEach(function(y) {
                        this._addGlassPane(0.66, 0.09, 0, y);
                    }.bind(this));
                } else if (glassLayout === 'grid-2x2') {
                    this._addGlassPane(0.3, 0.36, -0.19, 0.33);
                    this._addGlassPane(0.3, 0.36, 0.19, 0.33);
                    this._addGlassPane(0.3, 0.36, -0.19, -0.33);
                    this._addGlassPane(0.3, 0.36, 0.19, -0.33);
                } else {
                    this._addGlassPane(0.6, 0.9, 0, 0.04);
                }
            }

            this.parts.transom.visible = decor === 'transom' && !isSliding;
            this.parts.leafB.visible = isDouble;
            this.parts.hinges.visible = !isSliding;
            this.parts.slidingTrack.visible = isSliding;

            const leafW = isDouble ? 0.38 : 0.82;
            this.parts.leafABody.geometry.dispose();
            this.parts.leafABody.geometry = new THREE.BoxGeometry(leafW, 2.0, 0.055);
            this.parts.leafPanelInset.scale.set(isDouble ? 0.46 : 1, 1, 1);

            if (isSliding) {
                this.parts.leafA.position.set(isDouble ? -0.2 : 0, 0, 0);
                if (isDouble) {
                    this.parts.leafB.visible = true;
                    this.parts.leafB.position.set(0.22, 0, 0);
                }
                this.parts.leafA.rotation.y = 0;
                this.parts.leafB.rotation.y = 0;
            } else {
                this.parts.leafA.position.set(isDouble ? 0.2 : 0, 0, 0);
                this.parts.leafB.position.set(-0.2, 0, 0);
            const openRad = 0.48;
            this.parts.leafA.rotation.y = opening === 'left' ? openRad : -openRad;
            this.parts.leafB.rotation.y = opening === 'left' ? -openRad * 0.82 : openRad * 0.82;
            if (this.controls && this.controls.autoRotate !== undefined) {
                this.controls.autoRotate = true;
            }
            }

            this.parts.handle.visible = hardware.indexOf('lever') !== -1 && hardware.indexOf('knob') === -1;
            this.parts.pullHandle.visible = hardware.indexOf('pull') !== -1 || isSliding;

            const size = payload.size || {};
            const sx = (Number(size.widthCm) || 90) / 90;
            const sy = (Number(size.heightCm) || 230) / 230;
            this.doorRoot.scale.set(sx, sy, 1);
        }

        setZoomPercent(pct) {
            const p = Math.max(70, Math.min(140, Number(pct) || 100));
            this.zoomFactor = 100 / p;
            if (this.camera && this.controls) {
                const dist = this.baseZoom * this.zoomFactor;
                const dir = this.camera.position.clone().sub(this.controls.target).normalize();
                this.camera.position.copy(this.controls.target).add(dir.multiplyScalar(dist));
                this.controls.update();
            }
        }

        dispose() {
            if (this._raf) global.cancelAnimationFrame(this._raf);
            if (this._resizeObs) this._resizeObs.disconnect();
            if (this.controls) this.controls.dispose();
            if (this.renderer) {
                this.renderer.dispose();
                if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                    this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
                }
            }
            if (this.doorRoot) {
                this.doorRoot.traverse(function(obj) {
                    if (obj.geometry) obj.geometry.dispose();
                    if (obj.material) {
                        if (Array.isArray(obj.material)) obj.material.forEach(function(m) { m.dispose(); });
                        else obj.material.dispose();
                    }
                });
            }
            this.scene = null;
            this.camera = null;
            this.renderer = null;
            this.controls = null;
            this.doorRoot = null;
            this.parts = {};
        }
    }

    const NebrasDoor3D = {
        ready: true,
        error: null,
        mount: function(container) {
            if (!container) return false;
            let engine = instances.get(container);
            if (!engine) {
                engine = new NebrasDoor3DEngine(container);
                instances.set(container, engine);
            }
            const ok = engine.mount();
            if (ok) {
                container.setAttribute('data-3d-ready', '1');
                const loading = container.querySelector('.nebras-door-3d-loading');
                if (loading) loading.remove();
            }
            return ok;
        },
        update: function(payload) {
            const container = document.getElementById('nebras-door-3d-viewport');
            if (!container) return;
            let engine = instances.get(container);
            if (!engine || !engine.renderer) {
                if (!this.mount(container)) return;
                engine = instances.get(container);
            }
            if (engine) {
                Promise.resolve(engine.update(payload || {})).catch(function(err) {
                    console.warn('NebrasDoor3D update:', err);
                });
            }
        },
        setZoomPercent: function(pct) {
            const container = document.getElementById('nebras-door-3d-viewport');
            const engine = container ? instances.get(container) : null;
            if (engine) engine.setZoomPercent(pct);
        },
        dispose: function(container) {
            const el = container || document.getElementById('nebras-door-3d-viewport');
            if (!el) return;
            const engine = instances.get(el);
            if (engine) {
                engine.dispose();
                instances.delete(el);
            }
            el.innerHTML = '';
        },
        isMounted: function(container) {
            const el = container || document.getElementById('nebras-door-3d-viewport');
            return !!(el && instances.has(el) && instances.get(el).renderer);
        }
    };

    global.NebrasDoor3D = NebrasDoor3D;
})(typeof window !== 'undefined' ? window : this);
