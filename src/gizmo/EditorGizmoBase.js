'use strict';

/**
 * EditorGizmoBase.js
 * Fail-safe, high-performance Gizmo base class for Cocos Creator 3.8.8.
 * Inherits dynamically from the engine's internal `GizmoBase`.
 */

const { getGizmoBaseClass } = require('./GizmoDefines');
const GizmoDraw = require('./GizmoDraw');
const GizmoHandle = require('./GizmoHandle');
const GizmoLineHandle = require('./GizmoLineHandle');

const NativeGizmoBase = getGizmoBaseClass();

class EditorGizmoBase extends NativeGizmoBase {
    constructor(target) {
        super(target);
        this.draw = new GizmoDraw(this);
        this._handles = [];
        this._lineHandles = [];
        this._isInitialized = false;
    }

    get node() {
        return this.target ? this.target.node : null;
    }

    // ─── Lifecycle Methods to be Overridden by User ───

    init() {}
    onShow() {}
    onHide() {}
    onUpdate(dt) {}
    onTargetUpdate() {}
    onNodeChanged(info) {}
    onDestroy() {}

    // ─── Internal Engine Overrides with Fail-Safe Guards ───

    initialize() {
        if (this._isInitialized) return;
        this._isInitialized = true;
        try {
            this.init();
        } catch (err) {
            const compName = this.target ? (cc.js.getClassName(this.target) || this.target.name) : 'Unknown';
            console.error(`[EditorGizmo.init] Error in gizmo for "${compName}":`, err);
        }
    }

    show() {
        try {
            if (this._hidden && this.checkVisible()) {
                this.initialize();
                try {
                    this.onShow();
                } catch (err) {
                    console.error('[EditorGizmo.onShow] Error:', err);
                }
                this._hidden = false;
                this._showHandles();
            }
        } catch (err) {
            console.error('[EditorGizmo.show] Error:', err);
        }
    }

    hide() {
        try {
            if (!this._hidden) {
                try {
                    this.onHide();
                } catch (err) {
                    console.error('[EditorGizmo.onHide] Error:', err);
                }
                this._hidden = true;
                this._hideHandles();
            }
        } catch (err) {
            console.error('[EditorGizmo.hide] Error:', err);
        }
    }

    update(dt) {
        try {
            if (!this.checkVisible() || !this.target || !this.node || !this.node.isValid) return;
            this.onUpdate(dt);
        } catch (err) {
            const compName = this.target ? (cc.js.getClassName(this.target) || this.target.name) : 'Unknown';
            console.error(`[EditorGizmo.onUpdate] Error in gizmo for "${compName}":`, err);
        }
    }

    destroy() {
        try {
            try {
                this.onDestroy();
            } catch (err) {
                console.error('[EditorGizmo.onDestroy] Error:', err);
            }
            this.clearHandles();
            this.clearLineHandles();
            super.destroy();
        } catch (err) {
            console.error('[EditorGizmo.destroy] Error:', err);
        }
    }

    // ─── Handle Management ───

    createHandle(options = {}) {
        try {
            const handle = new GizmoHandle(this, options);
            this._handles.push(handle);
            return handle;
        } catch (err) {
            console.error('[EditorGizmo.createHandle] Error:', err);
            return null;
        }
    }

    clearHandles() {
        for (const h of this._handles) {
            try {
                h.destroy();
            } catch (err) {
                console.error('[EditorGizmo.clearHandles] Error destroying handle:', err);
            }
        }
        this._handles.length = 0;
    }
    createLineHandle(options = {}) {
        try {
            const handle = new GizmoLineHandle(this, options);
            this._lineHandles.push(handle);
            return handle;
        } catch (err) {
            console.error('[EditorGizmo.createLineHandle] Error:', err);
            return null;
        }
    }

    clearLineHandles() {
        for (const h of this._lineHandles) {
            try {
                h.destroy();
            } catch (err) {
                console.error('[EditorGizmo.clearLineHandles] Error destroying line handle:', err);
            }
        }
        this._lineHandles.length = 0;
    }

    getLineHandles() {
        return this._lineHandles;
    }

    _showHandles() {
        for (const h of this._handles) {
            h.setVisible(true);
        }
        for (const h of this._lineHandles) {
            h.setVisible(true);
        }
    }

    _hideHandles() {
        for (const h of this._handles) {
            h.setVisible(false);
        }
        for (const h of this._lineHandles) {
            h.setVisible(false);
        }
    }
}

module.exports = EditorGizmoBase;
