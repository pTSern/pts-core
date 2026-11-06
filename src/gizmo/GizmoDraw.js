'use strict';

/**
 * GizmoDraw.js
 * High-performance, fail-safe immediate-mode geometry drawing API for Cocos Creator 3.8.8.
 * Directly leverages `cce.Engine.getGeometryRenderer()` per-frame immediate buffers.
 */

const { getGeometryRenderer } = require('./GizmoDefines');

const _tempVec3_a = typeof cc !== 'undefined' ? new cc.Vec3() : null;
const _tempVec3_b = typeof cc !== 'undefined' ? new cc.Vec3() : null;
const _tempVec3_c = typeof cc !== 'undefined' ? new cc.Vec3() : null;
const _tempVec3_d = typeof cc !== 'undefined' ? new cc.Vec3() : null;
const _tempMat4 = typeof cc !== 'undefined' ? new cc.Mat4() : null;

class GizmoDraw {
    constructor(ownerGizmo) {
        this.owner = ownerGizmo;
        this.color = typeof cc !== 'undefined' ? new cc.Color(255, 255, 255, 255) : null;
        this.depthTest = false; // By default gizmos render in front
        this.wireframe = true;
    }

    get renderer() {
        return getGeometryRenderer();
    }

    get node() {
        return this.owner ? this.owner.node : null;
    }

    setColor(r, g, b, a = 255) {
        if (typeof r === 'object' && r !== null) {
            this.color = r;
        } else {
            this.color = new cc.Color(r, g, b, a);
        }
        return this;
    }

    setDepthTest(enable) {
        this.depthTest = Boolean(enable);
        return this;
    }

    setWireframe(enable) {
        this.wireframe = Boolean(enable);
        return this;
    }

    _toVec3(v, out) {
        if (!v) {
            out.set(0, 0, 0);
            return out;
        }
        if (typeof v.z === 'number') {
            out.set(v.x, v.y, v.z);
        } else {
            out.set(v.x, v.y, 0);
        }
        return out;
    }

    _toColor(c) {
        return c || this.color || cc.Color.WHITE;
    }

    _getWorldMatrix() {
        const node = this.node;
        if (!node || !node.isValid) return cc.Mat4.IDENTITY;
        node.getWorldMatrix(_tempMat4);
        return _tempMat4;
    }

    _transformPoint(localPt, out) {
        const mat = this._getWorldMatrix();
        this._toVec3(localPt, out);
        cc.Vec3.transformMat4(out, out, mat);
        return out;
    }

    _callAddLine(p0, p1, color, depthTest) {
        const r = this.renderer;
        if (!r) return;
        const c = this._toColor(color);
        if (typeof r.addLine === 'function') {
            r.addLine(p0, p1, c, depthTest);
        } else if (r._renderer && typeof r._renderer.addLine === 'function') {
            r._renderer.addLine(p0, p1, c, depthTest);
        } else if (typeof r.addDashedLine === 'function') {
            r.addDashedLine(p0, p1, c, depthTest);
        }
    }

    // ─── Immediate Mode Drawing Primitives ───

    drawLine(p0, p1, color = null, depthTest = this.depthTest) {
        try {
            this._toVec3(p0, _tempVec3_a);
            this._toVec3(p1, _tempVec3_b);
            this._callAddLine(_tempVec3_a, _tempVec3_b, color, depthTest);
        } catch (err) {
            console.error('[GizmoDraw.drawLine] Error:', err);
        }
        return this;
    }

    drawLocalLine(p0, p1, color = null, depthTest = this.depthTest) {
        try {
            this._transformPoint(p0, _tempVec3_a);
            this._transformPoint(p1, _tempVec3_b);
            this._callAddLine(_tempVec3_a, _tempVec3_b, color, depthTest);
        } catch (err) {
            console.error('[GizmoDraw.drawLocalLine] Error:', err);
        }
        return this;
    }

    drawDashedLine(p0, p1, color = null, depthTest = this.depthTest) {
        try {
            const r = this.renderer;
            if (!r) return this;
            this._toVec3(p0, _tempVec3_a);
            this._toVec3(p1, _tempVec3_b);
            r.addDashedLine(_tempVec3_a, _tempVec3_b, this._toColor(color), depthTest);
        } catch (err) {
            console.error('[GizmoDraw.drawDashedLine] Error:', err);
        }
        return this;
    }

    drawLocalDashedLine(p0, p1, color = null, depthTest = this.depthTest) {
        try {
            const r = this.renderer;
            if (!r) return this;
            this._transformPoint(p0, _tempVec3_a);
            this._transformPoint(p1, _tempVec3_b);
            r.addDashedLine(_tempVec3_a, _tempVec3_b, this._toColor(color), depthTest);
        } catch (err) {
            console.error('[GizmoDraw.drawLocalDashedLine] Error:', err);
        }
        return this;
    }

    drawCircle(center, radius, color = null, segments = 32, depthTest = this.depthTest) {
        try {
            const r = this.renderer;
            if (!r) return this;
            this._toVec3(center, _tempVec3_a);
            r.addCircle(_tempVec3_a, Math.max(0.001, radius), this._toColor(color), segments, depthTest);
        } catch (err) {
            console.error('[GizmoDraw.drawCircle] Error:', err);
        }
        return this;
    }

    drawLocalCircle(center, radius, color = null, segments = 32, depthTest = this.depthTest) {
        try {
            const r = this.renderer;
            if (!r) return this;
            const mat = this._getWorldMatrix();
            this._toVec3(center, _tempVec3_a);
            // In Cocos GeometryRenderer, addCircle supports (center, radius, color, segments, depthTest, useTransform, transform)
            r.addCircle(_tempVec3_a, Math.max(0.001, radius), this._toColor(color), segments, depthTest, true, mat);
        } catch (err) {
            console.error('[GizmoDraw.drawLocalCircle] Error:', err);
        }
        return this;
    }

    drawDisc(center, radius, color = null, segments = 32, wireframe = this.wireframe, depthTest = this.depthTest) {
        try {
            const r = this.renderer;
            if (!r) return this;
            this._toVec3(center, _tempVec3_a);
            r.addDisc(_tempVec3_a, Math.max(0.001, radius), this._toColor(color), segments, wireframe, depthTest);
        } catch (err) {
            console.error('[GizmoDraw.drawDisc] Error:', err);
        }
        return this;
    }

    drawLocalDisc(center, radius, color = null, segments = 32, wireframe = this.wireframe, depthTest = this.depthTest) {
        try {
            const r = this.renderer;
            if (!r) return this;
            const mat = this._getWorldMatrix();
            this._toVec3(center, _tempVec3_a);
            r.addDisc(_tempVec3_a, Math.max(0.001, radius), this._toColor(color), segments, wireframe, depthTest, false, true, mat);
        } catch (err) {
            console.error('[GizmoDraw.drawLocalDisc] Error:', err);
        }
        return this;
    }

    drawRect(center, width, height, color = null, wireframe = this.wireframe, depthTest = this.depthTest) {
        try {
            const r = this.renderer;
            if (!r) return this;
            this._toVec3(center, _tempVec3_a);
            const hw = width * 0.5;
            const hh = height * 0.5;
            const p0 = new cc.Vec3(_tempVec3_a.x - hw, _tempVec3_a.y - hh, _tempVec3_a.z);
            const p1 = new cc.Vec3(_tempVec3_a.x + hw, _tempVec3_a.y - hh, _tempVec3_a.z);
            const p2 = new cc.Vec3(_tempVec3_a.x + hw, _tempVec3_a.y + hh, _tempVec3_a.z);
            const p3 = new cc.Vec3(_tempVec3_a.x - hw, _tempVec3_a.y + hh, _tempVec3_a.z);
            r.addQuad(p0, p1, p2, p3, this._toColor(color), wireframe, depthTest);
        } catch (err) {
            console.error('[GizmoDraw.drawRect] Error:', err);
        }
        return this;
    }

    drawLocalRect(center, width, height, color = null, wireframe = this.wireframe, depthTest = this.depthTest) {
        try {
            const r = this.renderer;
            if (!r) return this;
            this._toVec3(center, _tempVec3_a);
            const hw = width * 0.5;
            const hh = height * 0.5;
            _tempVec3_b.set(_tempVec3_a.x - hw, _tempVec3_a.y - hh, _tempVec3_a.z);
            _tempVec3_c.set(_tempVec3_a.x + hw, _tempVec3_a.y - hh, _tempVec3_a.z);
            _tempVec3_d.set(_tempVec3_a.x + hw, _tempVec3_a.y + hh, _tempVec3_a.z);
            const p3 = new cc.Vec3(_tempVec3_a.x - hw, _tempVec3_a.y + hh, _tempVec3_a.z);

            this._transformPoint(_tempVec3_b, _tempVec3_b);
            this._transformPoint(_tempVec3_c, _tempVec3_c);
            this._transformPoint(_tempVec3_d, _tempVec3_d);
            this._transformPoint(p3, p3);

            r.addQuad(_tempVec3_b, _tempVec3_c, _tempVec3_d, p3, this._toColor(color), wireframe, depthTest);
        } catch (err) {
            console.error('[GizmoDraw.drawLocalRect] Error:', err);
        }
        return this;
    }

    drawBox(center, size, color = null, wireframe = this.wireframe, depthTest = this.depthTest) {
        try {
            const r = this.renderer;
            if (!r) return this;
            this._toVec3(center, _tempVec3_a);
            this._toVec3(size, _tempVec3_b);
            const min = new cc.Vec3(_tempVec3_a.x - _tempVec3_b.x * 0.5, _tempVec3_a.y - _tempVec3_b.y * 0.5, _tempVec3_a.z - _tempVec3_b.z * 0.5);
            const max = new cc.Vec3(_tempVec3_a.x + _tempVec3_b.x * 0.5, _tempVec3_a.y + _tempVec3_b.y * 0.5, _tempVec3_a.z + _tempVec3_b.z * 0.5);
            r.addBoundingBox(min, max, this._toColor(color), wireframe, depthTest);
        } catch (err) {
            console.error('[GizmoDraw.drawBox] Error:', err);
        }
        return this;
    }

    drawLocalBox(center, size, color = null, wireframe = this.wireframe, depthTest = this.depthTest) {
        try {
            const r = this.renderer;
            if (!r) return this;
            const mat = this._getWorldMatrix();
            this._toVec3(center, _tempVec3_a);
            this._toVec3(size, _tempVec3_b);
            const min = new cc.Vec3(_tempVec3_a.x - _tempVec3_b.x * 0.5, _tempVec3_a.y - _tempVec3_b.y * 0.5, _tempVec3_a.z - _tempVec3_b.z * 0.5);
            const max = new cc.Vec3(_tempVec3_a.x + _tempVec3_b.x * 0.5, _tempVec3_a.y + _tempVec3_b.y * 0.5, _tempVec3_a.z + _tempVec3_b.z * 0.5);
            r.addBoundingBox(min, max, this._toColor(color), wireframe, depthTest, false, true, mat);
        } catch (err) {
            console.error('[GizmoDraw.drawLocalBox] Error:', err);
        }
        return this;
    }

    drawSphere(center, radius, color = null, segments = 16, wireframe = this.wireframe, depthTest = this.depthTest) {
        try {
            const r = this.renderer;
            if (!r) return this;
            this._toVec3(center, _tempVec3_a);
            r.addSphere(_tempVec3_a, Math.max(0.001, radius), this._toColor(color), segments, wireframe, depthTest);
        } catch (err) {
            console.error('[GizmoDraw.drawSphere] Error:', err);
        }
        return this;
    }

    drawLocalSphere(center, radius, color = null, segments = 16, wireframe = this.wireframe, depthTest = this.depthTest) {
        try {
            const r = this.renderer;
            if (!r) return this;
            const mat = this._getWorldMatrix();
            this._toVec3(center, _tempVec3_a);
            r.addSphere(_tempVec3_a, Math.max(0.001, radius), this._toColor(color), segments, wireframe, depthTest, false, true, mat);
        } catch (err) {
            console.error('[GizmoDraw.drawLocalSphere] Error:', err);
        }
        return this;
    }

    drawPolygon(points, color = null, wireframe = true, depthTest = this.depthTest) {
        try {
            if (!Array.isArray(points) || points.length < 2) return this;
            const len = points.length;
            for (let i = 0; i < len; i++) {
                const next = (i + 1) % len;
                if (!wireframe && next === 0) continue;
                this._toVec3(points[i], _tempVec3_a);
                this._toVec3(points[next], _tempVec3_b);
                this._callAddLine(_tempVec3_a, _tempVec3_b, color, depthTest);
            }
        } catch (err) {
            console.error('[GizmoDraw.drawPolygon] Error:', err);
        }
        return this;
    }

    drawLocalPolygon(points, color = null, wireframe = true, depthTest = this.depthTest) {
        try {
            if (!Array.isArray(points) || points.length < 2) return this;
            const len = points.length;
            for (let i = 0; i < len; i++) {
                const next = (i + 1) % len;
                if (!wireframe && next === 0) continue;
                this._transformPoint(points[i], _tempVec3_a);
                this._transformPoint(points[next], _tempVec3_b);
                this._callAddLine(_tempVec3_a, _tempVec3_b, color, depthTest);
            }
        } catch (err) {
            console.error('[GizmoDraw.drawLocalPolygon] Error:', err);
        }
        return this;
    }

    drawBezier(p0, p1, p2, p3, color = null, segments = 32, depthTest = this.depthTest) {
        try {
            const r = this.renderer;
            if (!r) return this;
            this._toVec3(p0, _tempVec3_a);
            this._toVec3(p1, _tempVec3_b);
            this._toVec3(p2, _tempVec3_c);
            this._toVec3(p3, _tempVec3_d);
            r.addBezier(_tempVec3_a, _tempVec3_b, _tempVec3_c, _tempVec3_d, this._toColor(color), segments, depthTest);
        } catch (err) {
            console.error('[GizmoDraw.drawBezier] Error:', err);
        }
        return this;
    }

    drawLocalBezier(p0, p1, p2, p3, color = null, segments = 32, depthTest = this.depthTest) {
        try {
            const r = this.renderer;
            if (!r) return this;
            this._transformPoint(p0, _tempVec3_a);
            this._transformPoint(p1, _tempVec3_b);
            this._transformPoint(p2, _tempVec3_c);
            this._transformPoint(p3, _tempVec3_d);
            r.addBezier(_tempVec3_a, _tempVec3_b, _tempVec3_c, _tempVec3_d, this._toColor(color), segments, depthTest);
        } catch (err) {
            console.error('[GizmoDraw.drawLocalBezier] Error:', err);
        }
        return this;
    }

    drawCross(center, size = 10, color = null, depthTest = this.depthTest) {
        try {
            this._toVec3(center, _tempVec3_a);
            const hs = size * 0.5;
            _tempVec3_b.set(_tempVec3_a.x - hs, _tempVec3_a.y, _tempVec3_a.z);
            _tempVec3_c.set(_tempVec3_a.x + hs, _tempVec3_a.y, _tempVec3_a.z);
            this._callAddLine(_tempVec3_b, _tempVec3_c, color, depthTest);
            _tempVec3_b.set(_tempVec3_a.x, _tempVec3_a.y - hs, _tempVec3_a.z);
            _tempVec3_c.set(_tempVec3_a.x, _tempVec3_a.y + hs, _tempVec3_a.z);
            this._callAddLine(_tempVec3_b, _tempVec3_c, color, depthTest);
            _tempVec3_b.set(_tempVec3_a.x, _tempVec3_a.y, _tempVec3_a.z - hs);
            _tempVec3_c.set(_tempVec3_a.x, _tempVec3_a.y, _tempVec3_a.z + hs);
            this._callAddLine(_tempVec3_b, _tempVec3_c, color, depthTest);
        } catch (err) {
            console.error('[GizmoDraw.drawCross] Error:', err);
        }
        return this;
    }

    drawArrow(origin, target, color = null, headSize = 10, depthTest = this.depthTest) {
        try {
            this._toVec3(origin, _tempVec3_a);
            this._toVec3(target, _tempVec3_b);
            this._callAddLine(_tempVec3_a, _tempVec3_b, color, depthTest);

            const dir = new cc.Vec3();
            cc.Vec3.subtract(dir, _tempVec3_b, _tempVec3_a);
            const len = dir.length();
            if (len > 0.001) {
                dir.normalize();
                const normal = Math.abs(dir.y) < 0.99 ? cc.Vec3.UP : cc.Vec3.FORWARD;
                const right = new cc.Vec3();
                cc.Vec3.cross(right, dir, normal);
                right.normalize();

                const p1 = new cc.Vec3();
                const p2 = new cc.Vec3();
                cc.Vec3.scaleAndAdd(p1, _tempVec3_b, dir, -headSize);
                cc.Vec3.scaleAndAdd(p1, p1, right, headSize * 0.4);
                cc.Vec3.scaleAndAdd(p2, _tempVec3_b, dir, -headSize);
                cc.Vec3.scaleAndAdd(p2, p2, right, -headSize * 0.4);

                this._callAddLine(_tempVec3_b, p1, color, depthTest);
                this._callAddLine(_tempVec3_b, p2, color, depthTest);
            }
        } catch (err) {
            console.error('[GizmoDraw.drawArrow] Error:', err);
        }
        return this;
    }
}

module.exports = GizmoDraw;
