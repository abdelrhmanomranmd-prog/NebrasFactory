/**
 * نبراس — فحص صحة الإطلاق (صامت افتراضياً)
 * يكتشف مشاكل الداشبورد الشائعة دون إزعاج F12 للزوار.
 */
(function(global) {
    'use strict';

    function isHqAdmin() {
        try {
            return typeof global.isMainGovernanceAdmin === 'function' && global.isMainGovernanceAdmin(global.currentAdmin);
        } catch (e) { return false; }
    }

    function verifyNebrasLaunchHealth() {
        const issues = [];
        const dash = document.getElementById('admin-dashboard');
        if (!dash || !dash.classList.contains('show') || !isHqAdmin()) return issues;

        if (dash.classList.contains('dashboard-hr-only') || dash.classList.contains('dashboard-legal-only')) {
            issues.push('قيود دور قديمة على الإدارة الرئيسية');
            if (typeof global.resetDashboardRolePresentation === 'function') {
                global.resetDashboardRolePresentation();
            }
            if (typeof global.repairDashboardTilesIntegrity === 'function') global.repairDashboardTilesIntegrity();
            if (typeof global.renderDashboardTiles === 'function') global.renderDashboardTiles();
        }

        const quick = document.getElementById('dashboard-actions-grid');
        const visible = quick ? quick.querySelectorAll('.dashboard-tile-card').length : 0;
        if (visible < 8) {
            issues.push('أيقونات الداشبورد: ' + visible);
            if (typeof global.repairDashboardTilesIntegrity === 'function') global.repairDashboardTilesIntegrity();
            if (typeof global.renderDashboardTiles === 'function') global.renderDashboardTiles();
        }

        const testIcon = document.createElement('i');
        testIcon.className = 'fas fa-check';
        testIcon.style.cssText = 'position:absolute;left:-9999px;opacity:0;pointer-events:none';
        document.body.appendChild(testIcon);
        const iconW = testIcon.getBoundingClientRect().width;
        testIcon.remove();
        if (iconW < 4) issues.push('Font Awesome غير محمّل');

        if (issues.length && global.__NEBRAS_LAUNCH_DEBUG__) {
            console.warn('[Nebras Launch]', issues.join(' · '));
        }
        return issues;
    }

    global.verifyNebrasLaunchHealth = verifyNebrasLaunchHealth;

    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(verifyNebrasLaunchHealth, 2500);
    });
})(window);
