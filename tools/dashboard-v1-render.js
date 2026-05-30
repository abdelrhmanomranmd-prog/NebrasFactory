        function renderDashboardTiles() {
            const quick = document.getElementById('dashboard-actions-grid');
            const secondary = document.getElementById('dashboard-secondary-grid');
            const lang = currentLang || 'ar';
            const visible = dashboardTiles.filter(function(t) {
                if (t.visible === false) return false;
                if (t.permission && currentAdmin && !canManage(t.permission)) return false;
                return true;
            });

            function tileTitle(tile) {
                const t = getLocalizedCatalogField(tile, 'title', lang);
                const icon = tile.titleIcon ? '<i class="' + escapeHtmlAttr(tile.titleIcon) + '"></i> ' : '';
                return icon + escapeHtmlAttr(t);
            }

            function buildDashboardTileCard(tile, zone, index) {
                const title = getLocalizedCatalogField(tile, 'title', lang);
                const text = getLocalizedCatalogField(tile, 'text', lang);
                const extraClass = tile.cssClass ? ' ' + escapeHtmlAttr(tile.cssClass) : '';
                const zoneClass = zone === 'grid' ? ' dashboard-tile-card--grid' : ' dashboard-tile-card--quick';
                return '<div class="dashboard-tile-card' + zoneClass + extraClass + '" data-tile-id="' + escapeHtmlAttr(tile.id) + '" style="--tile-i:' + index + '" onclick="onDashboardTileClick(\'' + String(tile.id).replace(/'/g, "\\'") + '\')" role="button" tabindex="0">' +
                    '<div class="dashboard-tile-glow" aria-hidden="true"></div>' +
                    '<div class="dashboard-tile-icon"><i class="' + escapeHtmlAttr(tile.iconClass || 'fas fa-star') + '"></i></div>' +
                    '<h3>' + escapeHtmlAttr(title) + '</h3>' +
                    '<p>' + escapeHtmlAttr(text) + '</p>' +
                    '<span class="dashboard-tile-arrow"><i class="fas fa-arrow-left"></i> فتح</span></div>';
            }

            if (quick) {
                quick.classList.add('dashboard-tiles-bento');
                const quickTiles = visible.filter(function(t) { return t.zone === 'quick'; });
                quick.innerHTML = quickTiles.map(function(tile, i) { return buildDashboardTileCard(tile, 'quick', i); }).join('');
                quickTiles.forEach(function(tile) {
                    const node = quick.querySelector('[data-tile-id="' + tile.id + '"]');
                    if (node && tile.backgroundImage) applyBackgroundToNode(node, tile.backgroundImage, false);
                });
            }

            if (secondary) {
                secondary.classList.add('dashboard-tiles-bento');
                const gridTiles = visible.filter(function(t) { return t.zone === 'grid'; });
                secondary.innerHTML = gridTiles.map(function(tile, i) { return buildDashboardTileCard(tile, 'grid', i); }).join('');
                gridTiles.forEach(function(tile) {
                    const node = secondary.querySelector('[data-tile-id="' + tile.id + '"]');
                    if (node && tile.backgroundImage) applyBackgroundToNode(node, tile.backgroundImage, false);
                });
            }
            renderPartnersMarquees();
        }
