/**
 * Nebras — محرك 3D لمصمم الأبواب (يعمل مع file:// و Vercel — بدون ES modules)
 * يتطلب: three.min.js + OrbitControls.js قبل هذا الملف
 *
 * v2 — جودة استوديو: إضاءة فيزيائية + بيئة انعكاسات + إطار باب حقيقي
 * مفصلات تدور حولها الضلفة فعلياً + مقابض معدنية حسب الاختيار + زجاج فيزيائي
 * حركات ناعمة + إيقاف الرسم عند الخروج من الشاشة + إدارة ذاكرة كاملة.
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
            this.autoRotateSpeed = 0.9;
            this.enableDamping = true;
            this.dampingFactor = 0.08;
            this.minDistance = 1.6;
            this.maxDistance = 6;
            this.minPolarAngle = 0.4;
            this.maxPolarAngle = Math.PI * 0.48;
            // قوس أمامي فقط — الباب لا يختفي خلف الجدار ولا يظهر كخطّ رفيع من الجانب
            this.minAzimuthAngle = -1.05;
            this.maxAzimuthAngle = 1.05;
            this._spinDir = 1;
            this._dragging = false;
            this._lastX = 0;
            this._lastY = 0;
            this._vTheta = 0;
            this._vPhi = 0;
            this._resumeTimer = 0;
            const self = this;
            this._onDown = function(e) {
                self._dragging = true;
                self.autoRotate = false;
                if (self._resumeTimer) clearTimeout(self._resumeTimer);
                self._lastX = e.clientX;
                self._lastY = e.clientY;
                try { domElement.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
            };
            this._onUp = function() {
                self._dragging = false;
                if (self._resumeTimer) clearTimeout(self._resumeTimer);
                self._resumeTimer = setTimeout(function() { self.autoRotate = true; }, 2200);
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
                // تأرجح ذهاب وإياب داخل القوس الأمامي بدل الدوران خلف الباب
                this.spherical.theta += 0.0065 * this.autoRotateSpeed * this._spinDir;
                if (this.spherical.theta >= this.maxAzimuthAngle - 0.04) this._spinDir = -1;
                if (this.spherical.theta <= this.minAzimuthAngle + 0.04) this._spinDir = 1;
            }
            if (this.enableDamping) {
                this.spherical.theta += this._vTheta;
                this.spherical.phi += this._vPhi;
                this._vTheta *= 1 - this.dampingFactor;
                this._vPhi *= 1 - this.dampingFactor;
            }
            this.spherical.theta = Math.max(this.minAzimuthAngle, Math.min(this.maxAzimuthAngle, this.spherical.theta));
            this.spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this.spherical.phi));
            this.spherical.makeSafe();
            this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius));
            const pos = new THREE.Vector3().setFromSpherical(this.spherical).add(this.target);
            this.camera.position.copy(pos);
            this.camera.lookAt(this.target);
        }

        dispose() {
            const el = this.domElement;
            if (this._resumeTimer) clearTimeout(this._resumeTimer);
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
            c.minAzimuthAngle = -1.05;
            c.maxAzimuthAngle = 1.05;
            c.target = target;
            if (c.autoRotate !== undefined) {
                c.autoRotate = true;
                c.autoRotateSpeed = 1.0;
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
        global.NebrasDoor3D = stubApi('مكتبة Three.js لم تُحمَّل — أعدي تحميل الصفحة (Ctrl+F5) أو افتحي الموقع عبر خادم محلي.');
        return;
    }

    /* ===================== أدوات الألوان والخامات ===================== */

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

    function loadTexture(url, maxAnisotropy) {
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
                    // نسخة كاملة واحدة من الرولّة على كل وجه — تطابق 100% مع الكتالوج
                    tex.wrapS = THREE.RepeatWrapping;
                    tex.wrapT = THREE.RepeatWrapping;
                    tex.repeat.set(1, 1);
                    if (maxAnisotropy) tex.anisotropy = Math.min(8, maxAnisotropy);
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

    function makeCanvasTexture(width, height, painter) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        painter(canvas.getContext('2d'), width, height);
        const tex = new THREE.CanvasTexture(canvas);
        applyTexColorSpace(tex);
        return tex;
    }

    function makeWpcMaterial(color, map, opts) {
        opts = opts || {};
        if (map) {
            // مع صورة الرولّة: اللون أبيض نقي حتى تظهر الرولّة 100% كما في الكتالوج
            return new THREE.MeshStandardMaterial({
                color: opts.mapTint != null ? opts.mapTint : 0xffffff,
                map: map,
                roughness: opts.roughness != null ? opts.roughness : 0.5,
                metalness: opts.metalness != null ? opts.metalness : 0.04,
                envMapIntensity: 0.45
            });
        }
        const c = color && color.isColor ? color.clone() : parseHex(color);
        return new THREE.MeshStandardMaterial({
            color: c,
            roughness: opts.roughness != null ? opts.roughness : 0.5,
            metalness: opts.metalness != null ? opts.metalness : 0.04,
            envMapIntensity: 0.55
        });
    }

    function makeGlassMaterial(pattern) {
        const frosted = pattern === 'frosted';
        const reeded = pattern === 'reeded';
        if (THREE.MeshPhysicalMaterial) {
            return new THREE.MeshPhysicalMaterial({
                color: 0xdce8f0,
                roughness: frosted ? 0.55 : (reeded ? 0.3 : 0.06),
                metalness: 0,
                transparent: true,
                opacity: frosted ? 0.82 : 0.5,
                transmission: frosted ? 0.35 : 0.7,
                thickness: 0.02,
                ior: 1.5,
                envMapIntensity: 1.1,
                clearcoat: frosted ? 0 : 0.6,
                clearcoatRoughness: 0.12
            });
        }
        return new THREE.MeshStandardMaterial({
            color: 0xc8dce8,
            roughness: frosted ? 0.55 : 0.06,
            metalness: 0.1,
            transparent: true,
            opacity: frosted ? 0.85 : 0.62
        });
    }

    function makeMetalMaterial(tint, opts) {
        opts = opts || {};
        return new THREE.MeshStandardMaterial({
            color: tint || 0x8a929a,
            roughness: opts.roughness != null ? opts.roughness : 0.28,
            metalness: opts.metalness != null ? opts.metalness : 0.92,
            envMapIntensity: 1.2
        });
    }

    /** خامة المقبض من معرّف الاختيار — black / chrome / inox / gold */
    function hardwareFinish(hardwareId) {
        const id = String(hardwareId || '').toLowerCase();
        if (id.indexOf('gold') !== -1 || id.indexOf('brass') !== -1) {
            return makeMetalMaterial(0xc9a227, { roughness: 0.22 });
        }
        if (id.indexOf('black') !== -1) {
            return makeMetalMaterial(0x1d1f22, { roughness: 0.42, metalness: 0.7 });
        }
        return makeMetalMaterial(0xc6ccd4, { roughness: 0.16 });
    }

    /* ===================== المحرك ===================== */

    class NebrasDoor3DEngine {
        constructor(container) {
            this.container = container;
            this.scene = null;
            this.camera = null;
            this.renderer = null;
            this.controls = null;
            this.doorRoot = null;
            this.doorGroup = null;
            this._raf = 0;
            this._resizeObs = null;
            this._intersectObs = null;
            this._onVisibility = null;
            this.baseZoom = 3.1;
            this.zoomFactor = 1;
            this._visible = true;
            this._tweens = [];
            this._scaleTarget = null;
            this._envRT = null;
            this._lastState = null;
        }

        mount() {
            if (!this.container || this.renderer) return true;
            const self = this;
            const w = Math.max(this.container.clientWidth, 320);
            const h = Math.max(this.container.clientHeight, 420);

            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0xe9edf2);
            this.scene.fog = new THREE.Fog(0xe9edf2, 8, 18);

            this.camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 40);
            this.camera.position.set(1.9, 1.35, 3.0);

            try {
                this.renderer = new THREE.WebGLRenderer({
                    antialias: true,
                    alpha: false,
                    preserveDrawingBuffer: true,
                    powerPreference: 'high-performance'
                });
            } catch (webglErr) {
                this.container.innerHTML = '<p class="nebras-door-3d-error">المتصفح لا يدعم WebGL لعرض 3D.</p>';
                return false;
            }
            const isSmallScreen = Math.min(global.innerWidth || 1024, global.innerHeight || 768) < 760;
            this._isSmallScreen = isSmallScreen;
            this.renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, isSmallScreen ? 1.6 : 2));
            this.renderer.setSize(w, h);
            if ('outputColorSpace' in this.renderer && THREE.SRGBColorSpace) {
                this.renderer.outputColorSpace = THREE.SRGBColorSpace;
            } else if (THREE.sRGBEncoding) {
                this.renderer.outputEncoding = THREE.sRGBEncoding;
            }
            if (THREE.ACESFilmicToneMapping !== undefined) {
                this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
                this.renderer.toneMappingExposure = 1.04;
            }
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.container.innerHTML = '';
            this.container.appendChild(this.renderer.domElement);

            this._setupEnvironment();
            this._setupLights();
            this._setupBackdrop();

            this.doorRoot = new THREE.Group();
            this.doorRoot.position.y = 1.18;
            this.scene.add(this.doorRoot);

            this.controls = createOrbitControls(this.camera, this.renderer.domElement);
            if (this.controls.addEventListener) {
                let resumeTimer = 0;
                this.controls.addEventListener('start', function() {
                    if (self.controls) self.controls.autoRotate = false;
                    if (resumeTimer) clearTimeout(resumeTimer);
                });
                this.controls.addEventListener('end', function() {
                    if (resumeTimer) clearTimeout(resumeTimer);
                    resumeTimer = setTimeout(function() {
                        if (self.controls) self.controls.autoRotate = true;
                    }, 2200);
                });
            }

            function loop() {
                self._raf = global.requestAnimationFrame(loop);
                // الحاوية أُزيلت من الصفحة (إغلاق مساحة العمل) — تنظيف ذاتي كامل
                if (!self.container || !self.container.isConnected) {
                    const c = self.container;
                    self.dispose();
                    if (c) instances.delete(c);
                    return;
                }
                if (!self._visible || document.hidden) return;
                self._applyTweens();
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
            if (global.IntersectionObserver) {
                this._intersectObs = new IntersectionObserver(function(entries) {
                    entries.forEach(function(entry) { self._visible = entry.isIntersecting; });
                }, { threshold: 0.02 });
                this._intersectObs.observe(this.container);
            }
            return true;
        }

        _setupEnvironment() {
            try {
                if (!THREE.PMREMGenerator || !THREE.EquirectangularReflectionMapping) return;
                const envTex = makeCanvasTexture(256, 128, function(ctx, w, h) {
                    const grad = ctx.createLinearGradient(0, 0, 0, h);
                    grad.addColorStop(0, '#cfdcea');
                    grad.addColorStop(0.42, '#f4f8fc');
                    grad.addColorStop(0.55, '#ffffff');
                    grad.addColorStop(0.62, '#dde4ec');
                    grad.addColorStop(1, '#8e9aa8');
                    ctx.fillStyle = grad;
                    ctx.fillRect(0, 0, w, h);
                    // نافذة استوديو مضيئة — انعكاس مستطيل واقعي على المعادن والزجاج
                    ctx.fillStyle = 'rgba(255,255,255,0.95)';
                    ctx.fillRect(w * 0.16, h * 0.18, w * 0.16, h * 0.3);
                    ctx.fillRect(w * 0.62, h * 0.22, w * 0.12, h * 0.26);
                });
                envTex.mapping = THREE.EquirectangularReflectionMapping;
                const pmrem = new THREE.PMREMGenerator(this.renderer);
                this._envRT = pmrem.fromEquirectangular(envTex);
                this.scene.environment = this._envRT.texture;
                envTex.dispose();
                pmrem.dispose();
            } catch (e) { /* بيئة الانعكاسات اختيارية */ }
        }

        _setupLights() {
            if (THREE.HemisphereLight) {
                this.scene.add(new THREE.HemisphereLight(0xf4f8ff, 0x8d99a8, 0.55));
            } else {
                this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
            }
            const key = new THREE.DirectionalLight(0xfff6e8, 1.35);
            key.position.set(3.4, 5.4, 4.2);
            key.castShadow = true;
            const shadowRes = this._isSmallScreen ? 1024 : 2048;
            key.shadow.mapSize.set(shadowRes, shadowRes);
            key.shadow.camera.near = 1;
            key.shadow.camera.far = 16;
            key.shadow.camera.left = -3;
            key.shadow.camera.right = 3;
            key.shadow.camera.top = 4;
            key.shadow.camera.bottom = -1;
            key.shadow.bias = -0.0004;
            if ('radius' in key.shadow) key.shadow.radius = 4;
            this.scene.add(key);

            const fill = new THREE.DirectionalLight(0xbcd0e4, 0.42);
            fill.position.set(-3.2, 2.6, 1.6);
            this.scene.add(fill);

            const rim = new THREE.DirectionalLight(0xffffff, 0.35);
            rim.position.set(-1.4, 3.4, -3.6);
            this.scene.add(rim);
        }

        _setupBackdrop() {
            const floorTex = makeCanvasTexture(512, 512, function(ctx, w, h) {
                const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.08, w / 2, h / 2, w * 0.72);
                grad.addColorStop(0, '#e3e7ec');
                grad.addColorStop(0.6, '#d2d7de');
                grad.addColorStop(1, '#b9c0c9');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, w, h);
                // خطوط بلاط رفيعة جداً للواقعية
                ctx.strokeStyle = 'rgba(120,130,142,0.16)';
                ctx.lineWidth = 2;
                for (let i = 1; i < 4; i++) {
                    ctx.beginPath();
                    ctx.moveTo((w / 4) * i, 0);
                    ctx.lineTo((w / 4) * i, h);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(0, (h / 4) * i);
                    ctx.lineTo(w, (h / 4) * i);
                    ctx.stroke();
                }
            });
            const floor = new THREE.Mesh(
                new THREE.PlaneGeometry(12, 12),
                new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.82, metalness: 0.04, envMapIntensity: 0.35 })
            );
            floor.rotation.x = -Math.PI / 2;
            floor.receiveShadow = true;
            this.scene.add(floor);

            const wall = new THREE.Mesh(
                new THREE.PlaneGeometry(14, 6),
                new THREE.MeshStandardMaterial({ color: 0xf1f3f6, roughness: 0.96, metalness: 0 })
            );
            wall.position.set(0, 3, -2.2);
            wall.receiveShadow = true;
            this.scene.add(wall);

            // وزرة سفلية على الجدار الخلفي
            const skirting = new THREE.Mesh(
                new THREE.BoxGeometry(14, 0.12, 0.02),
                new THREE.MeshStandardMaterial({ color: 0xdfe3e8, roughness: 0.8 })
            );
            skirting.position.set(0, 0.06, -2.19);
            this.scene.add(skirting);

            // ظل تلامس ناعم تحت الباب
            const blobTex = makeCanvasTexture(256, 128, function(ctx, w, h) {
                const grad = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
                grad.addColorStop(0, 'rgba(20,28,38,0.42)');
                grad.addColorStop(0.65, 'rgba(20,28,38,0.16)');
                grad.addColorStop(1, 'rgba(20,28,38,0)');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, w, h);
            });
            const blob = new THREE.Mesh(
                new THREE.PlaneGeometry(2.3, 0.95),
                new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false })
            );
            blob.rotation.x = -Math.PI / 2;
            blob.position.set(0, 0.012, 0.16);
            this.scene.add(blob);
        }

        _onResize() {
            if (!this.container || !this.renderer || !this.camera) return;
            const w = Math.max(this.container.clientWidth, 1);
            const h = Math.max(this.container.clientHeight, 1);
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
        }

        _applyTweens() {
            for (let i = 0; i < this._tweens.length; i++) {
                const tw = this._tweens[i];
                const cur = tw.o[tw.k];
                tw.o[tw.k] = cur + (tw.t - cur) * 0.08;
            }
            if (this._scaleTarget && this.doorRoot) {
                const s = this.doorRoot.scale;
                s.x += (this._scaleTarget.x - s.x) * 0.1;
                s.y += (this._scaleTarget.y - s.y) * 0.1;
                if (this._scaleTarget.z) s.z += (this._scaleTarget.z - s.z) * 0.1;
            }
        }

        _disposeDoorGroup() {
            if (!this.doorGroup) return;
            const group = this.doorGroup;
            this.doorRoot.remove(group);
            group.traverse(function(obj) {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    // لا نتخلص من خامات الرولات المخزنة (textureCache) — material.dispose لا يلمس الخرائط
                    if (Array.isArray(obj.material)) obj.material.forEach(function(m) { m.dispose(); });
                    else obj.material.dispose();
                }
            });
            this.doorGroup = null;
            this._tweens = [];
        }

        /* ---------- بناء الباب — يعاد بالكامل عند كل تغيير اختيار ---------- */

        _buildDoor(state, base, map, sizeObj) {
            const group = new THREE.Group();
            const W = 0.92;   // فتحة الإطار الصافية
            const H = 2.08;
            const halfW = W / 2;
            const halfH = H / 2;
            // سماكة الضلفة من المقاس المختار — مكبّرة بصرياً ليظهر فرق 3.5 / 4.5 سم بوضوح
            const thicknessCm = (sizeObj && Number(sizeObj.thicknessCm)) || 4.5;
            const leafT = Math.max(0.055, Math.min(0.12, thicknessCm * 0.021));

            const isDouble = !!state.isDouble;
            const isSliding = !!state.isSliding;
            const opening = state.opening || 'right';
            const surface = state.surface || 'flat';
            const decor = state.decor || 'plain';
            const glassLayout = state.glassLayout || 'strip-tall';
            const glassPattern = state.glassPattern || 'clear';
            const hardware = state.hardware || 'lever-black';
            const outerShape = state.outerShape || state.frame || 'outer-flat';

            const leafMat = makeWpcMaterial(base, map);
            // الحلق بنفس الرولّة مع تعتيم خفيف جداً للعمق البصري — دون تشويه اللون
            const frameMat = makeWpcMaterial(shadeColor(base, -0.24), map, { roughness: 0.62, mapTint: 0xd4d4d4 });
            const archMat = makeWpcMaterial(shadeColor(base, -0.12), map, { roughness: 0.58, mapTint: 0xe8e8e8 });
            const hwMat = hardwareFinish(hardware);

            /* الإطار الحقيقي — قائمتان + رأس + بروز أرشيتريف */
            const jambD = 0.16;
            const jambW = 0.09;
            const headH = 0.09;
            const jambGeoSide = new THREE.BoxGeometry(jambW, H + headH, jambD);
            const jambL = new THREE.Mesh(jambGeoSide, frameMat);
            jambL.position.set(-halfW - jambW / 2, headH / 2 - 0.005, 0);
            jambL.castShadow = true;
            const jambR = new THREE.Mesh(jambGeoSide.clone(), frameMat);
            jambR.position.set(halfW + jambW / 2, headH / 2 - 0.005, 0);
            jambR.castShadow = true;
            const head = new THREE.Mesh(new THREE.BoxGeometry(W + jambW * 2, headH, jambD), frameMat);
            head.position.set(0, halfH + headH / 2, 0);
            head.castShadow = true;
            group.add(jambL, jambR, head);

            // أرشيتريف أمامي رفيع — يعطي عمق إطار حقيقي
            const trimT = 0.035;
            const trimW = 0.05;
            const trimL = new THREE.Mesh(new THREE.BoxGeometry(trimW, H + headH + trimW, trimT), archMat);
            trimL.position.set(-halfW - jambW + 0.005, headH / 2, jambD / 2 + trimT / 2 - 0.01);
            const trimR = trimL.clone();
            trimR.position.x = halfW + jambW - 0.005;
            const trimTop = new THREE.Mesh(new THREE.BoxGeometry(W + jambW * 2 + trimW, trimW, trimT), archMat);
            trimTop.position.set(0, halfH + headH - 0.005, jambD / 2 + trimT / 2 - 0.01);
            group.add(trimL, trimR, trimTop);

            // عمق الغرفة خلف الفتحة — يظهر عند انفراج الضلفة
            const interior = new THREE.Mesh(
                new THREE.PlaneGeometry(W - 0.02, H - 0.02),
                new THREE.MeshStandardMaterial({ color: 0x10161e, roughness: 1, metalness: 0 })
            );
            interior.position.set(0, 0, -jambD / 2 + 0.005);
            group.add(interior);

            // عتبة معدنية
            const threshold = new THREE.Mesh(new THREE.BoxGeometry(W + jambW * 2, 0.035, jambD + 0.04), makeMetalMaterial(0x4a5158, { roughness: 0.4 }));
            threshold.position.set(0, -halfH - 0.018, 0.01);
            group.add(threshold);

            /* التكسية العلوية (transom) */
            if (decor === 'transom' && !isSliding) {
                const transomPanel = new THREE.Mesh(new THREE.BoxGeometry(W + jambW * 2, 0.3, 0.07), makeWpcMaterial(shadeColor(base, 0.05), map));
                transomPanel.position.set(0, halfH + headH + 0.15, 0.02);
                transomPanel.castShadow = true;
                const transomGlass = new THREE.Mesh(new THREE.BoxGeometry(W - 0.1, 0.18, 0.02), makeGlassMaterial(glassPattern));
                transomGlass.position.set(0, halfH + headH + 0.15, 0.06);
                group.add(transomPanel, transomGlass);
            }

            /* الضلف */
            const leafH = H - 0.05;
            const gap = 0.012;
            const self = this;

            function buildLeaf(leafW, hingeSide, withHardware) {
                // المحور عند حافة المفصلات — الضلفة تمتد من المحور
                const pivot = new THREE.Group();
                const dir = hingeSide === 'left' ? 1 : -1;
                const geo = new THREE.BoxGeometry(leafW, leafH, leafT);
                geo.translate(dir * leafW / 2, 0, 0);
                const body = new THREE.Mesh(geo, leafMat);
                body.castShadow = true;
                body.receiveShadow = true;
                pivot.add(body);
                pivot.position.set(hingeSide === 'left' ? -halfW + gap : halfW - gap, 0, jambD / 2 - leafT / 2 - 0.01);
                const cx = dir * leafW / 2; // مركز الضلفة محلياً

                // حافة إيدج باند داكنة عند طرف الفتح
                const edge = new THREE.Mesh(
                    new THREE.BoxGeometry(0.012, leafH, leafT + 0.002),
                    makeWpcMaterial(shadeColor(base, -0.3), null, { roughness: 0.5 })
                );
                edge.position.set(dir * (leafW - 0.006), 0, 0);
                pivot.add(edge);

                const detail = { pivot: pivot, cx: cx, leafW: leafW, dir: dir, body: body, leafT: leafT };

                if (withHardware) self._addHardware(pivot, detail, hardware, hwMat, isSliding);
                if (!isSliding) self._addHinges(pivot, detail, leafH);
                self._addSurfaceDetails(pivot, detail, surface, outerShape, base, map);
                if (surface === 'u-glass' || surface === 'full-glass') {
                    self._addGlass(pivot, detail, glassLayout, glassPattern);
                }
                return detail;
            }

            const tweens = [];
            if (isDouble) {
                const leafW = (W - gap * 3) / 2;
                const leafA = buildLeaf(leafW, 'left', opening !== 'left');
                const leafB = buildLeaf(leafW, 'right', opening === 'left');
                group.add(leafA.pivot, leafB.pivot);
                if (isSliding) {
                    // ضلفتا سحاب — انزلاق أفقي متقابل
                    leafA.pivot.position.z = jambD / 2 - leafT / 2 + 0.015;
                    tweens.push({ o: leafA.pivot.position, k: 'x', t: -halfW + gap + 0.16 });
                    tweens.push({ o: leafB.pivot.position, k: 'x', t: halfW - gap - 0.16 });
                } else {
                    const active = opening === 'left' ? leafB : leafA;
                    const passive = opening === 'left' ? leafA : leafB;
                    tweens.push({ o: active.pivot.rotation, k: 'y', t: active.dir === 1 ? -0.52 : 0.52 });
                    tweens.push({ o: passive.pivot.rotation, k: 'y', t: passive.dir === 1 ? -0.3 : 0.3 });
                }
            } else {
                const leafW = W - gap * 2;
                const hingeSide = opening === 'left' ? 'right' : 'left';
                const leaf = buildLeaf(leafW, hingeSide, true);
                group.add(leaf.pivot);
                if (isSliding) {
                    leaf.pivot.position.z = jambD / 2 - leafT / 2 + 0.015;
                    tweens.push({ o: leaf.pivot.position, k: 'x', t: leaf.pivot.position.x + leaf.dir * 0.2 });
                } else {
                    tweens.push({ o: leaf.pivot.rotation, k: 'y', t: leaf.dir === 1 ? -0.5 : 0.5 });
                }
            }

            /* مسار السحاب */
            if (isSliding) {
                const track = new THREE.Mesh(new THREE.BoxGeometry(W + jambW * 2 + 0.3, 0.05, 0.1), makeMetalMaterial(0x565d64, { roughness: 0.36 }));
                track.position.set(0, halfH + headH + 0.04, jambD / 2 + 0.02);
                track.castShadow = true;
                group.add(track);
                const rollers = new THREE.Group();
                [-0.3, 0.3].forEach(function(x) {
                    const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.02, 20), makeMetalMaterial(0x9aa2aa));
                    roller.rotation.x = Math.PI / 2;
                    roller.position.set(x, halfH + headH + 0.04, jambD / 2 + 0.05);
                    rollers.add(roller);
                });
                group.add(rollers);
            }

            this._tweens = tweens;
            return group;
        }

        _addHinges(pivot, d, leafH) {
            const mat = makeMetalMaterial(0xaab2ba, { roughness: 0.3 });
            [-leafH * 0.36, 0, leafH * 0.36].forEach(function(y) {
                const knuckle = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.1, 14), mat);
                knuckle.position.set(0, y, 0.0);
                pivot.add(knuckle);
                const plate = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.09, 0.006), mat);
                plate.position.set(d.dir * 0.025, y, 0.022);
                pivot.add(plate);
            });
        }

        _addHardware(pivot, d, hardwareId, hwMat, isSliding) {
            const id = String(hardwareId || '').toLowerCase();
            const hx = d.dir * (d.leafW - 0.075); // قرب الحافة الحرة
            const hy = -0.13;                      // ~1.05م من الأرض
            const front = (d.leafT || 0.055) / 2 + 0.008;
            const isPull = id.indexOf('pull') !== -1 || isSliding;
            const isKnob = id.indexOf('knob') !== -1;

            function addBothFaces(builder) {
                builder(front);      // الوجه الأمامي
                builder(-front);     // الوجه الخلفي
            }

            if (isPull) {
                addBothFaces(function(z) {
                    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.34, 18), hwMat);
                    bar.position.set(hx, hy + 0.04, z + Math.sign(z) * 0.02);
                    pivot.add(bar);
                    [-0.13, 0.13].forEach(function(dy) {
                        const standoff = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.04, 12), hwMat);
                        standoff.rotation.x = Math.PI / 2;
                        standoff.position.set(hx, hy + 0.04 + dy, z + Math.sign(z) * 0.001);
                        pivot.add(standoff);
                    });
                });
                return;
            }

            if (isKnob) {
                addBothFaces(function(z) {
                    const rosette = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.01, 22), hwMat);
                    rosette.rotation.x = Math.PI / 2;
                    rosette.position.set(hx, hy, z);
                    pivot.add(rosette);
                    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.03, 14), hwMat);
                    neck.rotation.x = Math.PI / 2;
                    neck.position.set(hx, hy, z + Math.sign(z) * 0.02);
                    pivot.add(neck);
                    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 22, 16), hwMat);
                    knob.position.set(hx, hy, z + Math.sign(z) * 0.045);
                    pivot.add(knob);
                });
            } else {
                // مقبض ليفر حقيقي — وردة + عنق + ذراع أفقي
                const dir = d.dir;
                addBothFaces(function(z) {
                    const rosette = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 22), hwMat);
                    rosette.rotation.x = Math.PI / 2;
                    rosette.position.set(hx, hy, z);
                    pivot.add(rosette);
                    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.035, 14), hwMat);
                    neck.rotation.x = Math.PI / 2;
                    neck.position.set(hx, hy, z + Math.sign(z) * 0.02);
                    pivot.add(neck);
                    const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.0095, 0.13, 14), hwMat);
                    lever.rotation.z = Math.PI / 2;
                    lever.position.set(hx - dir * 0.065, hy, z + Math.sign(z) * 0.038);
                    pivot.add(lever);
                    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.0105, 14, 10), hwMat);
                    tip.position.set(hx - dir * 0.13, hy, z + Math.sign(z) * 0.038);
                    pivot.add(tip);
                });
            }

            // أسطوانة قفل تحت المقبض
            const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 16), makeMetalMaterial(0x8d959d));
            cyl.rotation.x = Math.PI / 2;
            cyl.position.set(hx, hy - 0.085, front);
            pivot.add(cyl);
        }

        _addSurfaceDetails(pivot, d, surface, outerShape, base, map) {
            const cx = d.cx;
            const grooveMat = new THREE.MeshStandardMaterial({ color: 0x14181c, roughness: 0.92, transparent: true, opacity: 0.34 });
            const innerW = d.leafW - 0.16;
            const front = (d.leafT || 0.055) / 2 + 0.002;

            function hGroove(y, w) {
                const g = new THREE.Mesh(new THREE.BoxGeometry(w || innerW, 0.011, 0.004), grooveMat);
                g.position.set(cx, y, front);
                pivot.add(g);
            }
            function vChannel(x) {
                const ch = new THREE.Mesh(new THREE.BoxGeometry(0.013, 1.66, 0.005), grooveMat);
                ch.position.set(x, 0, front);
                pivot.add(ch);
            }

            if (outerShape === 'outer-curve' || outerShape === 'curve') {
                for (let i = 0; i < 5; i++) hGroove(-0.55 + i * 0.27);
            }

            if (surface === 'u-plain') {
                vChannel(cx - innerW * 0.32);
                vChannel(cx + innerW * 0.32);
                for (let i = 0; i < 3; i++) hGroove(-0.4 + i * 0.4, innerW * 0.6);
            } else if (surface === 'u-slats') {
                for (let i = 0; i < 12; i++) hGroove(-0.77 + i * 0.14);
            } else if (surface === 'u-classic') {
                // إطاران كلاسيكيان بارزان (علوي وسفلي)
                const panelMat = makeWpcMaterial(shadeColor(base, -0.08), map, { roughness: 0.48 });
                const pw = innerW * 0.78;
                [[0.48, 0.78], [-0.5, 0.74]].forEach(function(cfg) {
                    const py = cfg[0];
                    const ph = cfg[1];
                    const frame = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, 0.012), panelMat);
                    frame.position.set(cx, py, front);
                    pivot.add(frame);
                    const inset = new THREE.Mesh(new THREE.BoxGeometry(pw - 0.09, ph - 0.09, 0.008), makeWpcMaterial(shadeColor(base, 0.06), map));
                    inset.position.set(cx, py, front + 0.009);
                    pivot.add(inset);
                });
            }
        }

        _addGlass(pivot, d, glassLayout, glassPattern) {
            const self = this;
            const cx = d.cx;
            const front = (d.leafT || 0.055) / 2 + 0.0035;
            const beadMat = makeMetalMaterial(0x6a727a, { roughness: 0.45, metalness: 0.5 });
            const maxW = d.leafW - 0.22;

            function pane(w, h, x, y) {
                const glass = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.018), makeGlassMaterial(glassPattern));
                glass.position.set(x, y, front);
                pivot.add(glass);
                // إطار حشو رفيع حول الزجاج
                const frame = new THREE.Group();
                const t = 0.012;
                const top = new THREE.Mesh(new THREE.BoxGeometry(w + t * 2, t, 0.012), beadMat);
                top.position.set(0, h / 2 + t / 2, 0);
                const bottom = top.clone();
                bottom.position.y = -h / 2 - t / 2;
                const left = new THREE.Mesh(new THREE.BoxGeometry(t, h, 0.012), beadMat);
                left.position.set(-w / 2 - t / 2, 0, 0);
                const right = left.clone();
                right.position.x = w / 2 + t / 2;
                frame.add(top, bottom, left, right);
                frame.position.set(x, y, front + 0.002);
                pivot.add(frame);
                if (glassPattern === 'reeded') {
                    // أعمدة تضليع رأسية داخل اللوح
                    const reedMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, transparent: true, opacity: 0.25 });
                    const count = Math.max(3, Math.floor(w / 0.045));
                    for (let i = 1; i < count; i++) {
                        const rod = new THREE.Mesh(new THREE.BoxGeometry(0.004, h - 0.01, 0.004), reedMat);
                        rod.position.set(x - w / 2 + (w / count) * i, y, front + 0.011);
                        pivot.add(rod);
                    }
                }
            }

            if (glassLayout === 'strips-5') {
                [-0.56, -0.28, 0, 0.28, 0.56].forEach(function(y) {
                    pane(maxW * 0.92, 0.1, cx, y);
                });
            } else if (glassLayout === 'grid-2x2') {
                const gw = maxW * 0.42;
                pane(gw, 0.4, cx - maxW * 0.26, 0.36);
                pane(gw, 0.4, cx + maxW * 0.26, 0.36);
                pane(gw, 0.4, cx - maxW * 0.26, -0.36);
                pane(gw, 0.4, cx + maxW * 0.26, -0.36);
            } else if (glassLayout === 'full') {
                pane(maxW, 1.66, cx, 0.02);
            } else {
                pane(maxW * 0.5, 1.3, cx, 0.08);
            }
        }

        async update(payload) {
            payload = payload || {};
            const state = payload.state || {};
            const hex = (payload.color && payload.color.hex) || '#b8bcc4';
            const texUrl = (payload.color && payload.color.textureUrl) || '';
            const base = parseHex(hex);
            const maxAniso = this.renderer && this.renderer.capabilities && this.renderer.capabilities.getMaxAnisotropy
                ? this.renderer.capabilities.getMaxAnisotropy()
                : 0;

            const map = await loadTexture(texUrl, maxAniso);
            if (!this.doorRoot) return;

            const size = payload.size || {};
            this._disposeDoorGroup();
            // السماكة (3.5 / 4.5 سم) مبنية داخل هندسة الضلفة نفسها
            this.doorGroup = this._buildDoor(state, base, map, size);
            this.doorRoot.add(this.doorGroup);

            const sx = (Number(size.widthCm) || 90) / 90;
            const sy = (Number(size.heightCm) || 230) / 230;
            this._scaleTarget = { x: sx, y: sy, z: 1 };
            this._lastState = state;
        }

        setZoomPercent(pct) {
            const p = Math.max(70, Math.min(140, Number(pct) || 100));
            this.zoomFactor = 100 / p;
            const dist = this.baseZoom * this.zoomFactor;
            if (this.controls && this.controls.spherical) {
                // NebrasSimpleOrbit — المسافة تُدار عبر الإحداثيات الكروية
                this.controls.spherical.radius = Math.max(this.controls.minDistance, Math.min(this.controls.maxDistance, dist));
            } else if (this.camera && this.controls) {
                const dir = this.camera.position.clone().sub(this.controls.target).normalize();
                this.camera.position.copy(this.controls.target).add(dir.multiplyScalar(dist));
                this.controls.update();
            }
        }

        dispose() {
            if (this._raf) global.cancelAnimationFrame(this._raf);
            if (this._resizeObs) this._resizeObs.disconnect();
            if (this._intersectObs) this._intersectObs.disconnect();
            if (this.controls) this.controls.dispose();
            this._disposeDoorGroup();
            if (this._envRT) {
                this._envRT.dispose();
                this._envRT = null;
            }
            if (this.scene) {
                const sc = this.scene;
                sc.traverse(function(obj) {
                    if (obj.geometry) obj.geometry.dispose();
                    if (obj.material) {
                        if (Array.isArray(obj.material)) obj.material.forEach(function(m) { m.dispose(); });
                        else obj.material.dispose();
                    }
                });
            }
            if (this.renderer) {
                this.renderer.dispose();
                if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                    this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
                }
            }
            this.scene = null;
            this.camera = null;
            this.renderer = null;
            this.controls = null;
            this.doorRoot = null;
            this.doorGroup = null;
            this._tweens = [];
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
