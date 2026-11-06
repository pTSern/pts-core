'use strict';

/**
 * SvgGizmo.js
 * Ultra-high-performance SVG-based 2D Gizmo Overlay System for Cocos Creator 3.8.8.
 * Re-creates the beloved, lightweight 2.4.x SVG Gizmo experience directly over the editor viewport.
 * 
 * Features:
 * - 0 WebGL draw calls & 0 GPU mesh allocations
 * - Hooks into Cocos Creator Operation event bus (Priority 100)
 * - Native DOM SVG overlay with real-time camera projection
 * - Click on edge line -> inserts new vertex exactly at mouse position
 * - Ctrl+Click (or Cmd+Click) on dot -> deletes vertex instantly
 * - Drags vertices smoothly at 144Hz+ with instant stencil update
 * - Always 100% visible, no camera clipping or Z-fighting
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

function getOperation() {
    try {
        return require('E:/Editor/Creator/3.8.8/resources/app.asar/builtin/scene/dist/script/public/operation/index.js').default;
    } catch {
        try {
            return cce.Operation;
        } catch {
            return null;
        }
    }
}

class SvgGizmoManager {
    constructor() {
        this.overlay = null;
        this.activeGizmos = new Set();
        this._hooked = false;
        this._opHooked = false;
        this._onMouseDown = null;
        this._onMouseMove = null;
        this._onMouseUp = null;
    }

    getOverlay() {
        if (typeof document === 'undefined') return null;

        let svg = document.querySelector('#pts-svg-gizmo-overlay');
        if (!svg) {
            const gameDiv = document.querySelector('#GameDiv') || document.body;
            svg = document.createElementNS(SVG_NS, 'svg');
            svg.id = 'pts-svg-gizmo-overlay';
            svg.style.position = 'absolute';
            svg.style.top = '0';
            svg.style.left = '0';
            svg.style.width = '100%';
            svg.style.height = '100%';
            svg.style.pointerEvents = 'none';
            svg.style.zIndex = '99999';
            svg.style.overflow = 'visible';
            gameDiv.appendChild(svg);
        }

        this.overlay = svg;
        this._hookCameraEvents();
        this._hookOperationEvents();
        return svg;
    }

    _hookCameraEvents() {
        if (this._hooked) return;
        this._hooked = true;

        try {
            if (typeof cce !== 'undefined' && cce.Camera && cce.Camera.camera) {
                const camNode = cce.Camera.camera.node;
                if (camNode) {
                    camNode.on('transform-changed', () => {
                        this.updateAll();
                    });
                }
            }
        } catch {}
    }

    _hookOperationEvents() {
        if (this._opHooked) return;
        const op = getOperation();
        if (!op) return;
        this._opHooked = true;

        this._onMouseDown = (e) => {
            if (!e.leftButton) return;
            for (const g of this.activeGizmos) {
                if (!g.node || !g.node.isValid || !g.target || !g.target.isValid) continue;
                const handled = g.onOperationMouseDown(e);
                if (handled) {
                    e.propagationStopped = true;
                    return false; // Terminate event loop in Operation
                }
            }
        };

        this._onMouseMove = (e) => {
            for (const g of this.activeGizmos) {
                if (!g.node || !g.node.isValid || !g.target || !g.target.isValid) continue;
                const handled = g.onOperationMouseMove(e);
                if (handled) {
                    e.propagationStopped = true;
                    return false;
                }
            }
        };

        this._onMouseUp = (e) => {
            for (const g of this.activeGizmos) {
                if (!g.node || !g.node.isValid || !g.target || !g.target.isValid) continue;
                const handled = g.onOperationMouseUp(e);
                if (handled) {
                    e.propagationStopped = true;
                    return false;
                }
            }
        };

        // Priority 100 ensures our SVG gizmo runs BEFORE Gizmo=99, Camera=98, Selection=null
        op.on('mousedown', this._onMouseDown, 100);
        op.on('mousemove', this._onMouseMove, 100);
        op.on('mouseup', this._onMouseUp, 100);
    }

    add(gizmo) {
        this.activeGizmos.add(gizmo);
        this.getOverlay();
    }

    remove(gizmo) {
        this.activeGizmos.delete(gizmo);
        if (this.activeGizmos.size === 0) {
            this.clear();
        }
    }

    updateAll() {
        for (const g of this.activeGizmos) {
            try {
                g.updateSvg();
            } catch {}
        }
    }

    clear() {
        for (const g of this.activeGizmos) {
            try {
                g.destroy();
            } catch {}
        }
        this.activeGizmos.clear();
        if (this.overlay && this.overlay.parentElement) {
            this.overlay.remove();
        }
        this.overlay = null;
    }
}

const svgManager = new SvgGizmoManager();

class SvgPolygonGizmo {
    constructor(targetComponent, options = {}) {
        this.target = targetComponent;
        this.options = Object.assign({
            stroke: '#00e5ff',
            strokeWidth: 3,
            fill: 'rgba(0, 229, 255, 0.15)',
            handleFill: '#00ff00',
            handleStroke: '#ffffff',
            handleHoverFill: '#ffff00',
            handleRadius: 7,
            propName: 'poly',
        }, options);

        this.group = null;
        this.polygonElement = null;
        this.circleElements = [];
        this.cachedScreenPts = [];
        this._isDragging = false;
        this._dragIndex = -1;

        this.init();
    }

    get node() {
        return this.target ? this.target.node : null;
    }

    get points() {
        if (!this.target) return [];
        return this.target[this.options.propName] || [];
    }

    init() {
        const overlay = svgManager.getOverlay();
        if (!overlay) return;

        this.group = document.createElementNS(SVG_NS, 'g');
        this.group.style.pointerEvents = 'none';
        overlay.appendChild(this.group);

        svgManager.add(this);
        this.rebuild();
    }

    _worldToSvgPixel(worldPos) {
        try {
            const cam = cce.Camera.camera.camera;
            const sp = new cc.Vec3();
            cam.worldToScreen(sp, worldPos);
            const winHeight = svgManager.overlay ? svgManager.overlay.clientHeight : 660;
            return {
                x: sp.x,
                y: winHeight - sp.y,
            };
        } catch {
            return { x: 0, y: 0 };
        }
    }

    _svgPixelToLocalPoint(svgX, svgY) {
        try {
            const cam = cce.Camera.camera.camera;
            const winHeight = svgManager.overlay ? svgManager.overlay.clientHeight : 660;
            const glY = winHeight - svgY;
            const ray = new cc.geometry.Ray();
            cam.screenPointToRay(ray, svgX, glY);

            const node = this.node;
            const targetZ = node ? node.worldPosition.z : 0;
            if (Math.abs(ray.d.z) > 0.000001) {
                const t = (targetZ - ray.o.z) / ray.d.z;
                const worldHit = new cc.Vec3(ray.o.x + t * ray.d.x, ray.o.y + t * ray.d.y, targetZ);

                const invMat = new cc.Mat4();
                node.getWorldMatrix(invMat);
                cc.Mat4.invert(invMat, invMat);
                const localPos = new cc.Vec3();
                cc.Vec3.transformMat4(localPos, worldHit, invMat);
                return new cc.Vec2(Math.round(localPos.x * 10) / 10, Math.round(localPos.y * 10) / 10);
            }
        } catch {}
        return null;
    }

    rebuild() {
        if (!this.group || !this.target || !this.node) return;

        // Clear existing SVG elements
        while (this.group.firstChild) {
            this.group.removeChild(this.group.firstChild);
        }
        this.circleElements = [];

        const pts = this.points;
        if (!pts || pts.length < 2) return;

        // 1. Create SVG Polygon
        const poly = document.createElementNS(SVG_NS, 'polygon');
        poly.setAttribute('fill', this.options.fill);
        poly.setAttribute('stroke', this.options.stroke);
        poly.setAttribute('stroke-width', this.options.strokeWidth.toString());
        this.group.appendChild(poly);
        this.polygonElement = poly;

        // 2. Create SVG Circles for each vertex
        const len = pts.length;
        for (let i = 0; i < len; i++) {
            const circle = document.createElementNS(SVG_NS, 'circle');
            circle.setAttribute('r', this.options.handleRadius.toString());
            circle.setAttribute('fill', this.options.handleFill);
            circle.setAttribute('stroke', this.options.handleStroke);
            circle.setAttribute('stroke-width', '2');
            this.group.appendChild(circle);
            this.circleElements.push(circle);
        }

        this.updateSvg();
    }

    updateSvg() {
        if (!this.group || !this.target || !this.node || !this.node.isValid) return;

        const pts = this.points;
        if (!pts || pts.length < 2) return;

        const node = this.node;
        const mat = new cc.Mat4();
        node.getWorldMatrix(mat);

        const screenPts = [];
        const len = pts.length;
        for (let i = 0; i < len; i++) {
            const p = new cc.Vec3(pts[i].x, pts[i].y, 0);
            cc.Vec3.transformMat4(p, p, mat);
            const sp = this._worldToSvgPixel(p);
            screenPts.push(sp);
        }
        this.cachedScreenPts = screenPts;

        // Update polygon points attribute
        if (this.polygonElement) {
            const ptsStr = screenPts.map((p) => `${p.x},${p.y}`).join(' ');
            this.polygonElement.setAttribute('points', ptsStr);
        }

        // Update circle centers
        const circleCount = Math.min(screenPts.length, this.circleElements.length);
        for (let i = 0; i < circleCount; i++) {
            const circle = this.circleElements[i];
            circle.setAttribute('cx', screenPts[i].x.toString());
            circle.setAttribute('cy', screenPts[i].y.toString());
        }
    }

    onOperationMouseDown(e) {
        if (!this.cachedScreenPts || this.cachedScreenPts.length < 2) return false;

        const hitRadius = (this.options.handleRadius || 7) + 8; // 15px hit radius for easy clicking
        const hitRadiusSq = hitRadius * hitRadius;

        // 1. Check if clicked on any vertex circle
        for (let i = 0; i < this.cachedScreenPts.length; i++) {
            const pt = this.cachedScreenPts[i];
            const dx = e.x - pt.x;
            const dy = e.y - pt.y;
            if (dx * dx + dy * dy <= hitRadiusSq) {
                // Check Ctrl+Click or Cmd+Click -> Delete vertex!
                if (e.ctrlKey || e.metaKey) {
                    this.deleteVertex(i);
                    return true;
                }

                // Normal left click -> Start drag
                this._isDragging = true;
                this._dragIndex = i;
                if (cce.Utils && cce.Utils.recordChanges) {
                    cce.Utils.recordChanges([this.node.uuid]);
                }
                return true;
            }
        }

        // 2. Check if clicked on any polygon edge line
        const len = this.cachedScreenPts.length;
        let bestDist = Infinity;
        let insertIndex = -1;
        const lineTolerance = 12; // 12px hit tolerance for line clicks

        for (let i = 0; i < len; i++) {
            const next = (i + 1) % len;
            const a = this.cachedScreenPts[i];
            const b = this.cachedScreenPts[next];

            const abx = b.x - a.x;
            const aby = b.y - a.y;
            const apx = e.x - a.x;
            const apy = e.y - a.y;
            const segLenSq = abx * abx + aby * aby;
            if (segLenSq > 0.0001) {
                const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / segLenSq));
                const projX = a.x + t * abx;
                const projY = a.y + t * aby;
                const dist = Math.hypot(e.x - projX, e.y - projY);
                if (dist <= lineTolerance && dist < bestDist) {
                    bestDist = dist;
                    insertIndex = i + 1;
                }
            }
        }

        if (insertIndex !== -1) {
            const localHit = this._svgPixelToLocalPoint(e.x, e.y);
            if (localHit && this.target) {
                this.insertVertex(insertIndex, localHit);
                return true;
            }
        }

        return false;
    }

    onOperationMouseMove(e) {
        if (this._isDragging) {
            const localPos = this._svgPixelToLocalPoint(e.x, e.y);
            if (localPos && this.target) {
                if (typeof this.target.fastSetVertex === 'function') {
                    this.target.fastSetVertex(this._dragIndex, localPos.x, localPos.y);
                } else {
                    this.points[this._dragIndex].set(localPos.x, localPos.y);
                    if (typeof this.target.refresh === 'function') this.target.refresh();
                }
                this.updateSvg();
            }
            return true;
        }

        this.checkHover(e);
        return false;
    }

    notifyPropertyUpdated() {
        if (!this.target || !this.node) return;

        // 1. Invoke component property setter with fresh cloned Vec2 array
        const currentPts = this.points;
        const newArray = currentPts.map((p) => new cc.Vec2(Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10));
        this.target[this.options.propName] = newArray;

        // 2. Refresh target graphics stencil
        if (typeof this.target.refresh === 'function') {
            this.target.refresh();
        }

        // 3. Commit undo/redo history
        if (cce.Utils && cce.Utils.commitChanges) {
            cce.Utils.commitChanges();
        }

        // 4. Notify Cocos Creator scene change & Inspector
        if (cce.Utils && cce.Utils.onNodeChanged) {
            cce.Utils.onNodeChanged(this.node, { type: 'component-changed' });
        }
        if (cce.Node && typeof cce.Node.emit === 'function') {
            cce.Node.emit('change', this.node, { type: 'component-changed' });
        }

        try {
            const msgMgr = require('E:/Editor/Creator/3.8.8/resources/app.asar/builtin/scene/dist/script/3d/manager/message.js').messageManager;
            if (msgMgr && typeof msgMgr.broadcast === 'function') {
                msgMgr.broadcast('scene:change-node', this.node.uuid);
            }
        } catch {
            try {
                if (cce.Ipc && typeof cce.Ipc.broadcast === 'function') {
                    cce.Ipc.broadcast('scene:change-node', this.node.uuid);
                }
            } catch {}
        }
    }

    onOperationMouseUp(e) {
        if (this._isDragging) {
            this._isDragging = false;
            this._dragIndex = -1;
            this.notifyPropertyUpdated();
            this.rebuild();
            return true;
        }
        return false;
    }

    checkHover(e) {
        if (!this.cachedScreenPts) return;
        const hitRadius = (this.options.handleRadius || 7) + 8;
        const hitRadiusSq = hitRadius * hitRadius;
        let hoveredIndex = -1;

        for (let i = 0; i < this.cachedScreenPts.length; i++) {
            const pt = this.cachedScreenPts[i];
            const dx = e.x - pt.x;
            const dy = e.y - pt.y;
            if (dx * dx + dy * dy <= hitRadiusSq) {
                hoveredIndex = i;
                break;
            }
        }

        const op = getOperation();
        for (let i = 0; i < this.circleElements.length; i++) {
            const circle = this.circleElements[i];
            if (i === hoveredIndex) {
                circle.setAttribute('fill', this.options.handleHoverFill);
            } else {
                circle.setAttribute('fill', this.options.handleFill);
            }
        }

        if (hoveredIndex !== -1) {
            if (op && typeof op.changePointer === 'function') op.changePointer('pointer');
        } else {
            if (op && typeof op.changePointer === 'function') op.changePointer('default');
        }
    }

    deleteVertex(index) {
        if (this.points.length <= 3) {
            console.warn('[SvgGizmo] Polygon must have at least 3 vertices');
            return;
        }
        if (cce.Utils && cce.Utils.recordChanges) {
            cce.Utils.recordChanges([this.node.uuid]);
        }
        const updated = this.points.slice();
        updated.splice(index, 1);
        this.target[this.options.propName] = updated;

        this.notifyPropertyUpdated();
        this.rebuild();
    }

    insertVertex(index, localHit) {
        if (cce.Utils && cce.Utils.recordChanges) {
            cce.Utils.recordChanges([this.node.uuid]);
        }
        const updated = this.points.slice();
        updated.splice(index, 0, localHit);
        this.target[this.options.propName] = updated;

        this.notifyPropertyUpdated();
        this.rebuild();
    }
    destroy() {
        svgManager.remove(this);
        if (this.group && this.group.parentElement) {
            this.group.remove();
        }
        this.group = null;
        this.polygonElement = null;
        this.circleElements.length = 0;
        this.cachedScreenPts.length = 0;
    }
}

module.exports = {
    SvgGizmoManager: svgManager,
    SvgPolygonGizmo,
};
