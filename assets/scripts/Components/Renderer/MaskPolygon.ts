import { _decorator, Component, Mask, Graphics, Vec2, Vec3, Color, Mat4, Node } from 'cc';
import { EditorGizmo, gizmo } from '../../utils/pGizmo';

const { ccclass, property, requireComponent, executeInEditMode, menu } = _decorator;

const _tempMat4 = new Mat4();
const _tempVec3 = new Vec3();
const _tempLocalPos = new Vec3();

/**
 * MaskPolygonGizmo
 * Interactive Gizmo for MaskPolygon in Cocos Creator 3.8.8.
 * Provides wireframe visualization and draggable vertex handles in the scene view.
 */
interface ISvgPolygonGizmo {
    destroy(): void;
    rebuild(): void;
    updateSvg(): void;
}

export class MaskPolygonGizmo extends EditorGizmo<MaskPolygon> {
    private _svgGizmo: ISvgPolygonGizmo | null = null;

    public onShow(): void {
        this._initSvgGizmo();
    }

    public onHide(): void {
        this._destroySvgGizmo();
    }

    public onDestroy(): void {
        this._destroySvgGizmo();
    }

    public onTargetUpdate(): void {
        if (this._svgGizmo) {
            this._svgGizmo.rebuild();
        }
    }

    public onNodeChanged(_info: unknown): void {
        if (this._svgGizmo) {
            this._svgGizmo.updateSvg();
        }
    }

    public onUpdate(_dt: number): void {
        if (this._svgGizmo) {
            this._svgGizmo.updateSvg();
        }
    }

    private _initSvgGizmo(): void {
        this._destroySvgGizmo();
        try {
            const globalRef = (globalThis as unknown as {
                EditorGizmo?: {
                    SvgGizmo?: {
                        SvgPolygonGizmo: new (target: unknown, opt?: unknown) => ISvgPolygonGizmo;
                    };
                };
            }).EditorGizmo;

            if (globalRef && globalRef.SvgGizmo && globalRef.SvgGizmo.SvgPolygonGizmo) {
                this._svgGizmo = new globalRef.SvgGizmo.SvgPolygonGizmo(this.target, {
                    propName: 'poly',
                    stroke: '#00e5ff',
                    strokeWidth: 3,
                    fill: 'rgba(0, 229, 255, 0.15)',
                    handleFill: '#00ff00',
                    handleStroke: '#ffffff',
                    handleHoverFill: '#ffff00',
                    handleRadius: 7,
                });
            }
        } catch (err) {
            console.error('[MaskPolygonGizmo._initSvgGizmo] Error:', err);
        }
    }

    private _destroySvgGizmo(): void {
        if (this._svgGizmo) {
            try {
                this._svgGizmo.destroy();
            } catch {}
            this._svgGizmo = null;
        }
    }
}

/**
 * MaskPolygon
 * Custom polygon mask component for Cocos Creator 3.8.8.
 * Drives the Graphics component of a Mask using arbitrary polygon coordinates.
 */
@ccclass('MaskPolygon')
@requireComponent(Mask)
@executeInEditMode
@menu('pTS/Renderer/MaskPolygon')
@gizmo(MaskPolygonGizmo)
export class MaskPolygon extends Component {
    @property({ type: [Vec2], tooltip: 'Polygon vertices in local 2D space.' })
    private _poly: Vec2[] = [
        new Vec2(-100, -100),
        new Vec2(100, -100),
        new Vec2(100, 100),
        new Vec2(-100, 100),
    ];

    @property({ type: [Vec2], tooltip: 'Polygon vertices in local 2D space.' })
    get poly(): Vec2[] {
        return this._poly;
    }

    set poly(value: Vec2[]) {
        this._poly = value || [];
        this.refresh();
    }

    protected onLoad(): void {
        this._configureMask();
        this.refresh();
    }

    protected onEnable(): void {
        this._configureMask();
        this.refresh();
    }

    /**
     * Configures the sibling Mask component to GRAPHICS_STENCIL (type: 2)
     * so that Mask._updateGraphics() will not overwrite our custom polygon graphics.
     */
    private _configureMask(): void {
        try {
            const mask = this.getComponent(Mask);
            if (mask) {
                // In Cocos Creator 3.8.8:
                // MaskType.GRAPHICS_RECT = 0
                // MaskType.GRAPHICS_ELLIPSE = 1
                // MaskType.GRAPHICS_STENCIL = 2
                // When type is GRAPHICS_STENCIL, Mask._updateGraphics() skips rectangular generation.
                const stencilType = Mask.Type.GRAPHICS_STENCIL !== undefined ? Mask.Type.GRAPHICS_STENCIL : 2;
                if (mask.type !== stencilType) {
                    mask.type = stencilType;
                }
            }
        } catch (err) {
            console.error('[MaskPolygon._configureMask] Error:', err);
        }
    }

    /**
     * Updates an individual vertex coordinates and repaints.
     */
    public setVertex(index: number, x: number, y: number): void {
        if (index >= 0 && index < this._poly.length) {
            this._poly[index].set(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
            this.refresh();
        }
    }

    /**
     * High-performance vertex update during live dragging without triggering full IPC refresh.
     */
    public fastSetVertex(index: number, x: number, y: number): void {
        if (index >= 0 && index < this._poly.length) {
            this._poly[index].set(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
            this._fastRedrawGraphics();
        }
    }

    private _fastRedrawGraphics(): void {
        try {
            const graphics = this.getComponent(Graphics);
            if (!graphics) return;
            graphics.clear();
            const poly = this._poly;
            if (!poly || poly.length < 3) return;

            graphics.moveTo(poly[0].x, poly[0].y);
            for (let i = 1; i < poly.length; i++) {
                graphics.lineTo(poly[i].x, poly[i].y);
            }
            graphics.close();
            graphics.fill();
        } catch {}
    }

    /**
     * Adds a vertex to the polygon.
     */
    public addVertex(x = 0, y = 0): void {
        this._poly.push(new Vec2(x, y));
        this.refresh();
    }

    /**
     * Removes a vertex by index.
     */
    public removeVertex(index: number): void {
        if (this._poly.length > 3 && index >= 0 && index < this._poly.length) {
            this._poly.splice(index, 1);
            this.refresh();
        }
    }

    /**
     * Rebuilds the Mask Graphics stencil from the polygon vertices.
     */
    public refresh(): void {
        try {
            this._configureMask();

            let graphics = this.getComponent(Graphics);
            if (!graphics) {
                graphics = this.addComponent(Graphics);
            }
            if (!graphics) return;

            graphics.clear();
            const poly = this._poly;
            if (!poly || poly.length < 3) return;

            graphics.moveTo(poly[0].x, poly[0].y);
            for (let i = 1; i < poly.length; i++) {
                graphics.lineTo(poly[i].x, poly[i].y);
            }
            graphics.close();
            graphics.fill();
        } catch (err) {
            console.error('[MaskPolygon.refresh] Error updating mask graphics:', err);
        }
    }
}
