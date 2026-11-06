import {
    _decorator,
    Component,
    MeshRenderer,
    SpriteFrame,
    Vec2,
    Vec3,
    Color,
    utils,
    Material,
    builtinResMgr,
    Mat4,
    PolygonCollider2D,
} from 'cc';
import { EditorGizmo, gizmo } from '../../utils/pGizmo';

const { ccclass, property, executeInEditMode, requireComponent, menu } = _decorator;

const _tempMat4 = new Mat4();
const _tempVec3 = new Vec3();
const _tempLocalPos = new Vec3();

// ─── Self-Contained Ear-Clipping Triangulator ───

function getSignedPolygonArea(pts: Vec2[]): number {
    let area = 0;
    const n = pts.length;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
    }
    return area * 0.5;
}

function isPointInTriangle(
    px: number,
    py: number,
    ax: number,
    ay: number,
    bx: number,
    by: number,
    cx: number,
    cy: number
): boolean {
    const v0x = cx - ax;
    const v0y = cy - ay;
    const v1x = bx - ax;
    const v1y = by - ay;
    const v2x = px - ax;
    const v2y = py - ay;

    const dot00 = v0x * v0x + v0y * v0y;
    const dot01 = v0x * v1x + v0y * v1y;
    const dot02 = v0x * v2x + v0y * v2y;
    const dot11 = v1x * v1x + v1y * v1y;
    const dot12 = v1x * v2x + v1y * v2y;

    const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
    const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

    return u >= 0 && v >= 0 && u + v <= 1;
}

function triangulatePolygon(vertices: Vec2[]): number[] {
    const n = vertices.length;
    const indices: number[] = [];
    if (n < 3) return indices;

    // Check winding order (ensure counter-clockwise)
    const isCCW = getSignedPolygonArea(vertices) > 0;
    const vertIndices: number[] = [];
    for (let i = 0; i < n; i++) {
        vertIndices.push(isCCW ? i : n - 1 - i);
    }

    let count = n;
    let stop = 2 * count;
    let v = count - 1;

    while (count > 2) {
        if (stop-- <= 0) {
            // Degenerate or self-intersecting fallback: triangle fan
            indices.length = 0;
            for (let i = 1; i < n - 1; i++) {
                indices.push(0, i, i + 1);
            }
            return indices;
        }

        const u = v >= count ? 0 : v;
        v = (u + 1) >= count ? 0 : u + 1;
        const w = (v + 1) >= count ? 0 : v + 1;

        const ax = vertices[vertIndices[u]].x;
        const ay = vertices[vertIndices[u]].y;
        const bx = vertices[vertIndices[v]].x;
        const by = vertices[vertIndices[v]].y;
        const cx = vertices[vertIndices[w]].x;
        const cy = vertices[vertIndices[w]].y;

        // Convex angle check
        const cross = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
        if (cross <= 0.000001) continue;

        // Ear check: verify no other vertex is inside triangle
        let hasPointInside = false;
        for (let p = 0; p < count; p++) {
            if (p === u || p === v || p === w) continue;
            const px = vertices[vertIndices[p]].x;
            const py = vertices[vertIndices[p]].y;
            if (isPointInTriangle(px, py, ax, ay, bx, by, cx, cy)) {
                hasPointInside = true;
                break;
            }
        }

        if (!hasPointInside) {
            // Cut ear
            indices.push(vertIndices[u], vertIndices[v], vertIndices[w]);
            vertIndices.splice(v, 1);
            count--;
            stop = 2 * count;
        }
    }

    return indices;
}

// ─── Interactive Gizmo for MeshPolygonSprite ───

export class MeshPolygonSpriteGizmo extends EditorGizmo<MeshPolygonSprite> {
    private _syncingHandles = false;

    public onShow(): void {
        this._rebuildHandles();
    }

    public onTargetUpdate(): void {
        if (!this._syncingHandles) {
            this._rebuildHandles();
        }
    }

    public onNodeChanged(_info: unknown): void {
        this._syncHandlePositions();
    }

    public onUpdate(_dt: number): void {
        const target = this.target;
        if (!target || !target.isValid || !target.vertexes) return;
        const verts = target.vertexes;
        if (verts.length < 2) return;

        // Draw outer polygon border in green
        this.draw.setColor(100, 255, 100, 255);
        this.draw.drawLocalPolygon(verts, null, true);

        // Draw interior triangulated mesh edges in semi-transparent cyan
        const indices = target.lastTriangulatedIndices;
        if (indices && indices.length >= 3) {
            this.draw.setColor(0, 200, 255, 120);
            for (let i = 0; i < indices.length; i += 3) {
                const i0 = indices[i];
                const i1 = indices[i + 1];
                const i2 = indices[i + 2];
                if (i0 < verts.length && i1 < verts.length && i2 < verts.length) {
                    this.draw.drawLocalLine(verts[i0], verts[i1]);
                    this.draw.drawLocalLine(verts[i1], verts[i2]);
                    this.draw.drawLocalLine(verts[i2], verts[i0]);
                }
            }
        }

        // Draw vertex dots with highlighted active index
        const selectIdx = target.selectingIndex;
        for (let i = 0; i < verts.length; i++) {
            const isSelected = i === selectIdx;
            const color = isSelected ? Color.RED : Color.YELLOW;
            const size = isSelected ? 6 : 4;
            this.draw.drawLocalCircle(verts[i], size, color);
        }
    }

    private _rebuildHandles(): void {
        this.clearHandles();
        const target = this.target;
        if (!target || !target.isValid || !target.vertexes || !this.node || !this.node.isValid) return;
        const verts = target.vertexes;

        const node = this.node;
        const len = verts.length;

        for (let i = 0; i < len; i++) {
            const index = i;
            const isSelected = index === this.target.selectingIndex;
            const handle = this.createHandle({
                name: `MeshVertex_${index}`,
                size: isSelected ? 14 : 10,
                color: isSelected ? Color.RED : Color.GREEN,
                hoverColor: Color.YELLOW,
            });

            if (!handle) continue;

            handle.onDragStart(() => {
                this.target.selectingIndex = index;
            });

            handle.onDrag((_delta: Vec3, currentWorldPos: Vec3) => {
                try {
                    this._syncingHandles = true;
                    this.recordChanges();

                    // Convert world pos to local node coordinates
                    node.getWorldMatrix(_tempMat4);
                    Mat4.invert(_tempMat4, _tempMat4);
                    Vec3.transformMat4(_tempLocalPos, currentWorldPos, _tempMat4);

                    this.target.setVertex(index, _tempLocalPos.x, _tempLocalPos.y);

                    this.commitChanges();
                } catch (err) {
                    console.error('[MeshPolygonSpriteGizmo.onDrag] Error:', err);
                } finally {
                    this._syncingHandles = false;
                }
            });
        }

        this._syncHandlePositions();
    }

    private _syncHandlePositions(): void {
        const target = this.target;
        if (!target || !target.isValid || !target.vertexes || !this.node || !this.node.isValid) return;
        const verts = target.vertexes;
        const handles = this.getHandles();
        if (!handles || handles.length === 0) return;
        const node = this.node;
        node.getWorldMatrix(_tempMat4);

        const count = Math.min(verts.length, handles.length);
        for (let i = 0; i < count; i++) {
            const pt = verts[i];
            _tempVec3.set(pt.x, pt.y, 0);
            Vec3.transformMat4(_tempVec3, _tempVec3, _tempMat4);
            handles[i].setWorldPosition(_tempVec3);
        }
    }
}

// ─── Component Implementation ───

/**
 * MeshPolygonSprite
 * Generates and renders a custom 2D polygon mesh using a SpriteFrame in Cocos Creator 3.8.8.
 */
@ccclass('MeshPolygonSprite')
@executeInEditMode
@requireComponent(MeshRenderer)
@menu('pTS/Renderer/MeshPolygonSprite')
@gizmo(MeshPolygonSpriteGizmo)
export class MeshPolygonSprite extends Component {
    @property({ type: Vec2, tooltip: 'Texture UV offset.' })
    private _offset: Vec2 = new Vec2(0, 0);

    @property({ type: Vec2, tooltip: 'Texture UV offset.' })
    get offset(): Vec2 {
        return this._offset;
    }

    set offset(value: Vec2) {
        this._offset = value || new Vec2(0, 0);
        this.refresh();
    }

    @property({ type: SpriteFrame, tooltip: 'Sprite frame texture for the mesh.' })
    private _spriteFrame: SpriteFrame | null = null;

    @property({ type: SpriteFrame, tooltip: 'Sprite frame texture for the mesh.' })
    get spriteFrame(): SpriteFrame | null {
        return this._spriteFrame;
    }

    set spriteFrame(value: SpriteFrame | null) {
        this._spriteFrame = value;
        this.refresh();
    }

    @property({ type: [Vec2], tooltip: 'Polygon vertices defining the sprite shape.' })
    private _vertexes: Vec2[] = [
        new Vec2(-100, -100),
        new Vec2(100, -100),
        new Vec2(100, 100),
        new Vec2(-100, 100),
    ];

    @property({ type: [Vec2], tooltip: 'Polygon vertices defining the sprite shape.' })
    get vertexes(): Vec2[] {
        return this._vertexes;
    }

    set vertexes(value: Vec2[]) {
        this._vertexes = value || [];
        this.refresh();
    }

    @property({ tooltip: 'Index of the currently selected vertex for editor operations.' })
    public selectingIndex = 0;

    @property({ tooltip: 'Trigger to remove currently selected vertex in Inspector.' })
    get removeSelectedVertex(): boolean {
        return false;
    }

    set removeSelectedVertex(value: boolean) {
        if (value) {
            this.removeVertex(this.selectingIndex);
        }
    }

    @property({ tooltip: 'Trigger to re-triangulate and rebuild mesh in Inspector.' })
    get rebuildMesh(): boolean {
        return false;
    }

    set rebuildMesh(value: boolean) {
        if (value) {
            this.refresh();
        }
    }

    public lastTriangulatedIndices: number[] = [];

    protected onLoad(): void {
        this._initMaterial();
        this.refresh();
    }

    protected onEnable(): void {
        this.refresh();
    }

    public setVertex(index: number, x: number, y: number): void {
        if (index >= 0 && index < this._vertexes.length) {
            this._vertexes[index].set(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
            this.refresh();
        }
    }

    public addVertex(x = 0, y = 0): void {
        this._vertexes.push(new Vec2(x, y));
        this.refresh();
    }

    public removeVertex(index: number): void {
        if (this._vertexes.length > 3 && index >= 0 && index < this._vertexes.length) {
            this._vertexes.splice(index, 1);
            if (this.selectingIndex >= this._vertexes.length) {
                this.selectingIndex = Math.max(0, this._vertexes.length - 1);
            }
            this.refresh();
        }
    }

    private _initMaterial(): void {
        try {
            const renderer = this.getComponent(MeshRenderer);
            if (!renderer) return;

            let mat = renderer.getMaterial(0);
            if (!mat) {
                const builtinMat = builtinResMgr.get<Material>('ui-sprite-material')
                    || builtinResMgr.get<Material>('ui-base-material');
                if (builtinMat) {
                    renderer.setMaterial(builtinMat, 0);
                    mat = renderer.getMaterialInstance(0);
                }
            }
        } catch (err) {
            console.error('[MeshPolygonSprite._initMaterial] Error:', err);
        }
    }

    /**
     * Triangulates the polygon vertices, computes UVs, and constructs the 2D mesh.
     */
    public refresh(): void {
        try {
            const renderer = this.getComponent(MeshRenderer);
            if (!renderer || this._vertexes.length < 3) return;

            this._initMaterial();

            // 1. Triangulation
            const indices = triangulatePolygon(this._vertexes);
            this.lastTriangulatedIndices = indices;
            if (indices.length === 0) return;

            // 2. Build positions buffer
            const positions: number[] = [];
            for (const v of this._vertexes) {
                positions.push(v.x, v.y, 0);
            }

            // 3. Build UV buffer
            const uvs = this._calculateUVs();

            // 4. Construct Mesh
            const mesh = utils.createMesh({
                positions,
                uvs,
                indices,
            });

            renderer.mesh = mesh;

            // 5. Update material texture
            if (this._spriteFrame && this._spriteFrame.texture) {
                const mat = renderer.getMaterialInstance(0);
                if (mat) {
                    mat.setProperty('mainTexture', this._spriteFrame.texture);
                }
            }

            // 6. Sync PolygonCollider2D if attached
            this._syncCollider();
        } catch (err) {
            console.error('[MeshPolygonSprite.refresh] Error updating mesh:', err);
        }
    }

    private _calculateUVs(): number[] {
        const uvs: number[] = [];
        const sf = this._spriteFrame;
        const verts = this._vertexes;

        if (sf && sf.texture) {
            const uvData = sf.uv; // [u0, v0, u1, v1, u2, v2, u3, v3]
            const texWidth = sf.texture.width || 1;
            const texHeight = sf.texture.height || 1;

            const uMin = uvData ? Math.min(uvData[0], uvData[2], uvData[4], uvData[6]) : 0;
            const uMax = uvData ? Math.max(uvData[0], uvData[2], uvData[4], uvData[6]) : 1;
            const vMin = uvData ? Math.min(uvData[1], uvData[3], uvData[5], uvData[7]) : 0;
            const vMax = uvData ? Math.max(uvData[1], uvData[3], uvData[5], uvData[7]) : 1;

            const halfW = texWidth * 0.5;
            const halfH = texHeight * 0.5;

            for (const pt of verts) {
                const normX = (pt.x + halfW + this._offset.x) / texWidth;
                const normY = (halfH - pt.y + this._offset.y) / texHeight;

                const u = uMin + normX * (uMax - uMin);
                const v = vMin + normY * (vMax - vMin);
                uvs.push(Math.max(0, Math.min(1, u)), Math.max(0, Math.min(1, v)));
            }
        } else {
            // Default UV bounds from vertex bounding box
            let minX = Infinity;
            let maxX = -Infinity;
            let minY = Infinity;
            let maxY = -Infinity;
            for (const v of verts) {
                if (v.x < minX) minX = v.x;
                if (v.x > maxX) maxX = v.x;
                if (v.y < minY) minY = v.y;
                if (v.y > maxY) maxY = v.y;
            }
            const spanX = Math.max(1, maxX - minX);
            const spanY = Math.max(1, maxY - minY);

            for (const v of verts) {
                const u = (v.x - minX) / spanX;
                const vCoord = 1 - (v.y - minY) / spanY;
                uvs.push(u, vCoord);
            }
        }

        return uvs;
    }

    private _syncCollider(): void {
        try {
            const collider = this.getComponent(PolygonCollider2D);
            if (collider) {
                collider.points = this._vertexes.map((v) => new Vec2(v.x, v.y));
                collider.apply();
            }
        } catch {
            // Collider synchronization is optional
        }
    }
}
