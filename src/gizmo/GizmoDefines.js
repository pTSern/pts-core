'use strict';

/**
 * GizmoDefines.js
 * Locates and provides references to internal Cocos Creator 3.8.8 Scene Gizmo subsystems.
 * Runs inside the Scene Process where `cce` and `cc` are globally available.
 */

let _cachedGizmoBase = null;

function getGizmoBaseClass() {
    if (_cachedGizmoBase) return _cachedGizmoBase;

    try {
        if (typeof cce !== 'undefined' && cce.Gizmo && cce.Gizmo._gizmoPool) {
            const compDefs = cce.Gizmo._gizmoPool._getPool('component');
            if (compDefs && compDefs.typeDefs) {
                // Discover base class from existing built-in component gizmos
                const sampleGizmo = compDefs.typeDefs['cc.CircleCollider2D']
                    || compDefs.typeDefs['cc.BoxCollider2D']
                    || compDefs.typeDefs['cc.BoxCollider'];

                if (sampleGizmo) {
                    _cachedGizmoBase = Object.getPrototypeOf(sampleGizmo);
                    return _cachedGizmoBase;
                }
            }
        }
    } catch (err) {
        console.error('[pTS-Gizmo] Failed to discover internal GizmoBase:', err);
    }

    // Fallback stub in case discovery happens before scene initialization
    class FallbackGizmoBase {
        constructor(target) {
            this._target = target;
            this._hidden = true;
        }
        get target() { return this._target; }
        set target(t) { this._target = t; }
        get nodes() { return this.target ? [this.target.node] : []; }
        layer() { return 'scene'; }
        getGizmoRoot() {
            return (typeof cce !== 'undefined' && cce.Gizmo) ? cce.Gizmo.gizmoRootNode : null;
        }
        checkVisible() { return true; }
        visible() { return !this._hidden; }
        show() { this._hidden = false; }
        hide() { this._hidden = true; }
        update() {}
        destroy() { this.hide(); this._target = null; }
        recordChanges() {}
        commitChanges() {}
    }

    return FallbackGizmoBase;
}

function getGeometryRenderer() {
    try {
        if (typeof cce !== 'undefined' && cce.Engine && typeof cce.Engine.getGeometryRenderer === 'function') {
            const geo = cce.Engine.getGeometryRenderer();
            if (geo) {
                if (!geo.addLine && geo._renderer && typeof geo._renderer.addLine === 'function') {
                    geo.addLine = function(v0, v1, color, depthTest) {
                        return this._renderer.addLine(v0, v1, color, depthTest);
                    };
                }
                return geo;
            }
        }
    } catch (err) {
        console.error('[pTS-Gizmo] Failed to get GeometryRenderer:', err);
    }
    return null;
}

function getGizmoRootNode() {
    try {
        if (typeof cce !== 'undefined' && cce.Gizmo && cce.Gizmo.gizmoRootNode) {
            return cce.Gizmo.gizmoRootNode;
        }
    } catch (err) {
        console.error('[pTS-Gizmo] Failed to get gizmoRootNode:', err);
    }
    return null;
}

module.exports = {
    getGizmoBaseClass,
    getGeometryRenderer,
    getGizmoRootNode,
};
