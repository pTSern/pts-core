'use strict';

/**
 * GizmoLineHandle.js
 * Interactive clickable line segment connecting polygon vertices in Cocos Creator 3.8.8.
 * Detects clicks to insert a new vertex exactly on the line at the mouse position.
 */

const { getGizmoRootNode } = require('./GizmoDefines');

class GizmoLineHandle {
    constructor(ownerGizmo, options = {}) {
        this.owner = ownerGizmo;
        this.name = options.name || 'LineHandle';
        this.color = options.color || new cc.Color(0, 220, 255, 255);
        this.hoverColor = options.hoverColor || new cc.Color(255, 230, 0, 255);
        this.index = typeof options.index === 'number' ? options.index : 0;

        this.node = null;
        this.meshRenderer = null;
        this._p0 = new cc.Vec3();
        this._p1 = new cc.Vec3();
        this._onClickCallbacks = [];

        this._createNode(options);
    }

    _createNode(options) {
        try {
            const root = this.owner.getGizmoRoot() || getGizmoRootNode();
            if (!root) return;

            const lineNode = new cc.Node(this.name);
            lineNode.layer = cc.Layers.Enum.GIZMOS;
            lineNode.parent = root;

            const mr = lineNode.addComponent('cc.MeshRenderer');
            const mat = new cc.Material();
            mat.initialize({
                effectName: 'internal/editor/gizmo',
                technique: 1
            });
            mat.setProperty('mainColor', this.color);
            mr.material = mat;
            this.meshRenderer = mr;

            // Wire editor mouse events
            lineNode.on('mouseDown', this._handleMouseDown.bind(this));
            lineNode.on('hoverIn', this._handleHoverIn.bind(this));
            lineNode.on('hoverOut', this._handleHoverOut.bind(this));
            this.node = lineNode;
            if (options.p0 && options.p1) {
                this.updatePoints(options.p0, options.p1);
            }
        } catch (err) {
            console.error('[GizmoLineHandle._createNode] Error:', err);
        }
    }

    updatePoints(p0, p1) {
        try {
            if (!this.node || !this.node.isValid || !this.meshRenderer) return;
            this._p0.set(p0.x, p0.y, 5);
            this._p1.set(p1.x, p1.y, 5);

            const dir = new cc.Vec3();
            cc.Vec3.subtract(dir, this._p1, this._p0);
            const len = dir.length();
            if (len < 0.001) return;
            dir.normalize();

            // 10px solid visible ribbon with wide clickable hit area
            const thickness = 10;
            const normal = new cc.Vec3(-dir.y * thickness * 0.5, dir.x * thickness * 0.5, 0);

            const v0 = new cc.Vec3(this._p0.x - normal.x, this._p0.y - normal.y, 5);
            const v1 = new cc.Vec3(this._p0.x + normal.x, this._p0.y + normal.y, 5);
            const v2 = new cc.Vec3(this._p1.x + normal.x, this._p1.y + normal.y, 5);
            const v3 = new cc.Vec3(this._p1.x - normal.x, this._p1.y - normal.y, 5);

            const positions = [
                v0.x, v0.y, v0.z,
                v1.x, v1.y, v1.z,
                v2.x, v2.y, v2.z,
                v3.x, v3.y, v3.z
            ];
            const indices = [0, 1, 2,  0, 2, 3];

            const minPos = new cc.Vec3(
                Math.min(p0.x, p1.x) - 10,
                Math.min(p0.y, p1.y) - 10,
                -10
            );
            const maxPos = new cc.Vec3(
                Math.max(p0.x, p1.x) + 10,
                Math.max(p0.y, p1.y) + 10,
                10
            );

            const mesh = cc.utils.createMesh({
                positions,
                indices,
                minPos,
                maxPos,
                doubleSided: true
            });
            this.meshRenderer.mesh = mesh;

            if (mesh.renderingSubMeshes && mesh.renderingSubMeshes[0] && mesh.renderingSubMeshes[0].geometricInfo) {
                mesh.renderingSubMeshes[0].geometricInfo.doubleSided = true;
            }

            if (this.meshRenderer.model) {
                this.meshRenderer.model.createBoundingShape(minPos, maxPos);
                this.meshRenderer.model.updateWorldBound();
            }
        } catch (err) {
            console.error('[GizmoLineHandle.updatePoints] Error:', err);
        }
    }

    setVisible(visible) {
        try {
            if (this.node && this.node.isValid) {
                this.node.active = Boolean(visible);
            }
        } catch (err) {
            console.error('[GizmoLineHandle.setVisible] Error:', err);
        }
    }

    onClick(callback) {
        if (typeof callback === 'function') this._onClickCallbacks.push(callback);
        return this;
    }

    _screenToWorldOnPlane(screenX, screenY) {
        try {
            const cam = cce.Camera && cce.Camera.camera && cce.Camera.camera.camera;
            if (!cam) return null;
            const ray = new cc.geometry.Ray();
            cam.screenPointToRay(ray, screenX, screenY);
            const targetZ = this._p0 ? this._p0.z : 5;
            if (Math.abs(ray.d.z) > 0.000001) {
                const t = (targetZ - ray.o.z) / ray.d.z;
                return new cc.Vec3(ray.o.x + t * ray.d.x, ray.o.y + t * ray.d.y, targetZ);
            }
        } catch {}
        return null;
    }

    _updateColor(c) {
        try {
            if (this.meshRenderer && this.meshRenderer.material) {
                this.meshRenderer.material.setProperty('mainColor', c);
                if (typeof cce !== 'undefined' && cce.Engine) {
                    cce.Engine.repaintInEditMode();
                }
            }
        } catch {}
    }

    _handleMouseDown(event) {
        try {
            if (event) {
                event.propagationStopped = true;
            }

            let clickHit = null;
            if (event && event.hitPoint) {
                clickHit = event.hitPoint.clone();
                clickHit.z = 5;
            } else if (event && typeof event.x === 'number') {
                clickHit = this._screenToWorldOnPlane(event.x, event.y);
            }

            if (!clickHit) {
                clickHit = new cc.Vec3(
                    (this._p0.x + this._p1.x) * 0.5,
                    (this._p0.y + this._p1.y) * 0.5,
                    5
                );
            }

            // Project clickHit onto line segment [p0, p1]
            const lineDir = new cc.Vec3();
            cc.Vec3.subtract(lineDir, this._p1, this._p0);
            const lineLenSq = lineDir.lengthSqr();

            let clampedHit = clickHit;
            if (lineLenSq > 0.0001) {
                const toHit = new cc.Vec3();
                cc.Vec3.subtract(toHit, clickHit, this._p0);
                const t = Math.max(0.05, Math.min(0.95, cc.Vec3.dot(toHit, lineDir) / lineLenSq));
                clampedHit = new cc.Vec3(
                    this._p0.x + t * lineDir.x,
                    this._p0.y + t * lineDir.y,
                    5
                );
            }

            const callbacks = this._onClickCallbacks.slice();
            const edgeIndex = this.index;

            // Defer handle rebuild to next tick so current event dispatch completes cleanly
            setTimeout(() => {
                for (const cb of callbacks) {
                    try {
                        cb(clampedHit, edgeIndex, event);
                    } catch (cbErr) {
                        console.error('[GizmoLineHandle] Error in onClick callback:', cbErr);
                    }
                }
            }, 0);
        } catch (err) {
            console.error('[GizmoLineHandle._handleMouseDown] Error:', err);
        }
    }

    _handleHoverIn(event) {
        this._updateColor(this.hoverColor);
    }

    _handleHoverOut(event) {
        this._updateColor(this.color);
    }

    destroy() {
        try {
            if (this.node && this.node.isValid) {
                this.node.destroy();
            }
            this.node = null;
            this._onClickCallbacks.length = 0;
        } catch (err) {
            console.error('[GizmoLineHandle.destroy] Error:', err);
        }
    }
}

module.exports = GizmoLineHandle;
