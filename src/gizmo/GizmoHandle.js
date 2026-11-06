'use strict';

/**
 * GizmoHandle.js
 * Interactive scene manipulation handle for Cocos Creator 3.8.8.
 * Attaches to `cce.Gizmo.gizmoRootNode` and dispatches raycast drag/hover events.
 */

const { getGizmoRootNode } = require('./GizmoDefines');

class GizmoHandle {
    constructor(ownerGizmo, options = {}) {
        this.owner = ownerGizmo;
        this.name = options.name || 'CustomHandle';
        this.size = options.size || 12;
        this.color = options.color || new cc.Color(107, 194, 53, 255);
        this.hoverColor = options.hoverColor || new cc.Color(255, 230, 0, 255);

        this._isDragging = false;
        this._isHovered = false;
        this._dragStartPos = new cc.Vec3();
        this._lastPos = new cc.Vec3();
        this._currentWorldPos = new cc.Vec3();

        this._onDragStartCallbacks = [];
        this._onDragCallbacks = [];
        this._onDragEndCallbacks = [];
        this._onHoverCallbacks = [];

        this.node = null;
        this._createNode(options);
    }

    _createNode(options) {
        try {
            const root = this.owner.getGizmoRoot() || getGizmoRootNode();
            if (!root) return;

            const handleNode = new cc.Node(this.name);
            handleNode.layer = cc.Layers.Enum.GIZMOS;
            handleNode.parent = root;

            // Create visual quad mesh using internal/editor/gizmo material with raycast bounding box
            try {
                const s = this.size;
                const hw = s * 0.5;
                const positions = [-hw, -hw, 0,  hw, -hw, 0,  hw, hw, 0,  -hw, hw, 0];
                const indices = [0, 1, 2,  0, 2, 3];
                const minPos = new cc.Vec3(-hw, -hw, -10);
                const maxPos = new cc.Vec3(hw, hw, 10);
                const mesh = cc.utils.createMesh({ positions, indices, minPos, maxPos });
                const mr = handleNode.addComponent('cc.MeshRenderer');

                const mat = new cc.Material();
                mat.initialize({
                    effectName: 'internal/editor/gizmo',
                    technique: 1
                });
                mat.setProperty('mainColor', this.color);
                mr.material = mat;
                mr.mesh = mesh;
                this.meshRenderer = mr;

                if (mr.model) {
                    mr.model.createBoundingShape(minPos, maxPos);
                    mr.model.updateWorldBound();
                }
            } catch (meshErr) {
                console.error('[GizmoHandle] Failed to create visual mesh:', meshErr);
            }

            // Wire editor raycast events
            handleNode.on('mouseDown', this._handleMouseDown.bind(this));
            handleNode.on('mouseMove', this._handleMouseMove.bind(this));
            handleNode.on('mouseUp', this._handleMouseUp.bind(this));
            handleNode.on('hoverIn', this._handleHoverIn.bind(this));
            handleNode.on('hoverOut', this._handleHoverOut.bind(this));

            this.node = handleNode;
        } catch (err) {
            console.error('[GizmoHandle._createNode] Error:', err);
        }
    }

    _updateMeshColor(c) {
        try {
            if (this.meshRenderer && this.meshRenderer.material) {
                this.meshRenderer.material.setProperty('mainColor', c);
                if (typeof cce !== 'undefined' && cce.Engine) {
                    cce.Engine.repaintInEditMode();
                }
            }
        } catch {}
    }

    _screenToWorldOnPlane(screenX, screenY) {
        try {
            const cam = cce.Camera && cce.Camera.camera && cce.Camera.camera.camera;
            if (!cam) return null;
            const ray = new cc.geometry.Ray();
            cam.screenPointToRay(ray, screenX, screenY);
            const targetZ = this.node ? this.node.worldPosition.z : 5;
            if (Math.abs(ray.d.z) > 0.000001) {
                const t = (targetZ - ray.o.z) / ray.d.z;
                return new cc.Vec3(ray.o.x + t * ray.d.x, ray.o.y + t * ray.d.y, targetZ);
            }
        } catch (err) {
            console.error('[GizmoHandle._screenToWorldOnPlane] Error:', err);
        }
        return null;
    }

    setPosition(pos) {
        try {
            if (!this.node || !this.node.isValid) return;
            if (typeof pos.z === 'number') {
                this.node.setPosition(pos.x, pos.y, pos.z);
            } else {
                this.node.setPosition(pos.x, pos.y, 0);
            }
            this._currentWorldPos.set(this.node.worldPosition);
        } catch (err) {
            console.error('[GizmoHandle.setPosition] Error:', err);
        }
    }

    setWorldPosition(pos) {
        try {
            if (!this.node || !this.node.isValid) return;
            const z = typeof pos.z === 'number' && pos.z !== 0 ? pos.z : 5;
            this.node.setWorldPosition(pos.x, pos.y, z);
            this._currentWorldPos.set(this.node.worldPosition);
            if (this.meshRenderer && this.meshRenderer.model) {
                this.meshRenderer.model.updateWorldBound();
            }
        } catch (err) {
            console.error('[GizmoHandle.setWorldPosition] Error:', err);
        }
    }

    setVisible(visible) {
        try {
            if (this.node && this.node.isValid) {
                this.node.active = Boolean(visible);
            }
        } catch (err) {
            console.error('[GizmoHandle.setVisible] Error:', err);
        }
    }

    onDragStart(callback) {
        if (typeof callback === 'function') this._onDragStartCallbacks.push(callback);
        return this;
    }

    onDrag(callback) {
        if (typeof callback === 'function') this._onDragCallbacks.push(callback);
        return this;
    }

    onDragEnd(callback) {
        if (typeof callback === 'function') this._onDragEndCallbacks.push(callback);
        return this;
    }

    onHover(callback) {
        if (typeof callback === 'function') this._onHoverCallbacks.push(callback);
        return this;
    }

    _handleMouseDown(event) {
        try {
            this._isDragging = true;
            this._dragStartHit = (event && typeof event.x === 'number')
                ? this._screenToWorldOnPlane(event.x, event.y)
                : (event && event.hitPoint ? event.hitPoint.clone() : this.node.worldPosition.clone());
            this._dragStartVertex = this.node.worldPosition.clone();
            this._lastPos.set(this.node.worldPosition);

            this._updateMeshColor(this.hoverColor);
            if (this.owner && typeof this.owner.recordChanges === 'function') {
                this.owner.recordChanges();
            }
            for (const cb of this._onDragStartCallbacks) {
                try {
                    cb(this._dragStartVertex, event);
                } catch (cbErr) {
                    console.error('[GizmoHandle] Error in onDragStart:', cbErr);
                }
            }
        } catch (err) {
            console.error('[GizmoHandle._handleMouseDown] Error:', err);
        }
    }

    _handleMouseMove(event) {
        try {
            if (!this._isDragging) return;

            let newWorldPos = null;
            let delta = null;

            if (event && typeof event.x === 'number' && this._dragStartHit) {
                const currentHit = this._screenToWorldOnPlane(event.x, event.y);
                if (currentHit) {
                    delta = new cc.Vec3();
                    cc.Vec3.subtract(delta, currentHit, this._dragStartHit);
                    newWorldPos = new cc.Vec3();
                    cc.Vec3.add(newWorldPos, this._dragStartVertex, delta);
                    newWorldPos.z = 5;
                }
            }

            if (!newWorldPos && event && event.hitPoint) {
                newWorldPos = event.hitPoint.clone();
                newWorldPos.z = 5;
                delta = new cc.Vec3();
                cc.Vec3.subtract(delta, newWorldPos, this._lastPos);
            }

            if (!newWorldPos) return;

            this.setWorldPosition(newWorldPos);
            this._lastPos.set(newWorldPos);

            for (const cb of this._onDragCallbacks) {
                try {
                    cb(delta, newWorldPos, event);
                } catch (cbErr) {
                    console.error('[GizmoHandle] Error in onDrag:', cbErr);
                }
            }

            // NOTE: onComponentChanged is deferred to mouseUp to prevent IPC flooding on fast drag
        } catch (err) {
            console.error('[GizmoHandle._handleMouseMove] Error:', err);
        }
    }

    _handleMouseUp(event) {
        try {
            if (!this._isDragging) return;
            this._isDragging = false;
            this._updateMeshColor(this.color);

            for (const cb of this._onDragEndCallbacks) {
                try {
                    cb(this.node.worldPosition, event);
                } catch (cbErr) {
                    console.error(`[GizmoHandle] Error in onDragEnd:`, cbErr);
                }
            }

            // Commit undo transaction and notify inspector once on drag end
            if (this.owner && typeof this.owner.commitChanges === 'function') {
                this.owner.commitChanges();
            }
            if (this.owner && this.owner.target && this.owner.target.node) {
                this.owner.onComponentChanged(this.owner.target.node);
            }
        } catch (err) {
            console.error('[GizmoHandle._handleMouseUp] Error:', err);
        }
    }

    _handleHoverIn(event) {
        try {
            this._isHovered = true;
            this._updateMeshColor(this.hoverColor);
            for (const cb of this._onHoverCallbacks) {
                try {
                    cb(true, event);
                } catch (cbErr) {
                    console.error(`[GizmoHandle] Error in onHover:`, cbErr);
                }
            }
        } catch (err) {
            console.error('[GizmoHandle._handleHoverIn] Error:', err);
        }
    }

    _handleHoverOut(event) {
        try {
            this._isHovered = false;
            this._updateMeshColor(this.color);
            for (const cb of this._onHoverCallbacks) {
                try {
                    cb(false, event);
                } catch (cbErr) {
                    console.error(`[GizmoHandle] Error in onHover:`, cbErr);
                }
            }
        } catch (err) {
            console.error('[GizmoHandle._handleHoverOut] Error:', err);
        }
    }


    destroy() {
        try {
            if (this.node && this.node.isValid) {
                this.node.destroy();
            }
            this.node = null;
            this._onDragStartCallbacks.length = 0;
            this._onDragCallbacks.length = 0;
            this._onDragEndCallbacks.length = 0;
            this._onHoverCallbacks.length = 0;
        } catch (err) {
            console.error('[GizmoHandle.destroy] Error:', err);
        }
    }
}

module.exports = GizmoHandle;
