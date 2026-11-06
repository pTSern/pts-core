import { Component, Node, Vec3, Vec2, Color } from 'cc';
import { EDITOR } from 'cc/env';

/**
 * Interface representing the immediate-mode geometry drawing API.
 */
export interface IGizmoDraw {
    color: Color;
    depthTest: boolean;
    wireframe: boolean;

    setColor(color: Color): this;
    setColor(r: number, g: number, b: number, a?: number): this;
    setDepthTest(enable: boolean): this;
    setWireframe(enable: boolean): this;

    drawLine(p0: Vec3 | Vec2, p1: Vec3 | Vec2, color?: Color, depthTest?: boolean): this;
    drawLocalLine(p0: Vec3 | Vec2, p1: Vec3 | Vec2, color?: Color, depthTest?: boolean): this;
    drawDashedLine(p0: Vec3 | Vec2, p1: Vec3 | Vec2, color?: Color, depthTest?: boolean): this;
    drawLocalDashedLine(p0: Vec3 | Vec2, p1: Vec3 | Vec2, color?: Color, depthTest?: boolean): this;

    drawCircle(center: Vec3 | Vec2, radius: number, color?: Color, segments?: number, depthTest?: boolean): this;
    drawLocalCircle(center: Vec3 | Vec2, radius: number, color?: Color, segments?: number, depthTest?: boolean): this;

    drawDisc(center: Vec3 | Vec2, radius: number, color?: Color, segments?: number, wireframe?: boolean, depthTest?: boolean): this;
    drawLocalDisc(center: Vec3 | Vec2, radius: number, color?: Color, segments?: number, wireframe?: boolean, depthTest?: boolean): this;

    drawRect(center: Vec3 | Vec2, width: number, height: number, color?: Color, wireframe?: boolean, depthTest?: boolean): this;
    drawLocalRect(center: Vec3 | Vec2, width: number, height: number, color?: Color, wireframe?: boolean, depthTest?: boolean): this;

    drawBox(center: Vec3, size: Vec3, color?: Color, wireframe?: boolean, depthTest?: boolean): this;
    drawLocalBox(center: Vec3, size: Vec3, color?: Color, wireframe?: boolean, depthTest?: boolean): this;

    drawSphere(center: Vec3, radius: number, color?: Color, segments?: number, wireframe?: boolean, depthTest?: boolean): this;
    drawLocalSphere(center: Vec3, radius: number, color?: Color, segments?: number, wireframe?: boolean, depthTest?: boolean): this;

    drawPolygon(points: (Vec3 | Vec2)[], color?: Color, wireframe?: boolean, depthTest?: boolean): this;
    drawLocalPolygon(points: (Vec3 | Vec2)[], color?: Color, wireframe?: boolean, depthTest?: boolean): this;

    drawBezier(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, color?: Color, segments?: number, depthTest?: boolean): this;
    drawLocalBezier(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, color?: Color, segments?: number, depthTest?: boolean): this;

    drawCross(center: Vec3 | Vec2, size?: number, color?: Color, depthTest?: boolean): this;
    drawArrow(origin: Vec3 | Vec2, target: Vec3 | Vec2, color?: Color, headSize?: number, depthTest?: boolean): this;
}

/**
 * Interface representing an interactive manipulation handle.
 */
export interface IGizmoHandle {
    readonly name: string;
    readonly node: Node | null;

    setPosition(pos: Vec3 | Vec2): void;
    setWorldPosition(pos: Vec3 | Vec2): void;
    setVisible(visible: boolean): void;

    onDragStart(cb: (startPos: Vec3, event: unknown) => void): this;
    onDrag(cb: (delta: Vec3, currentPos: Vec3, event: unknown) => void): this;
    onDragEnd(cb: (endPos: Vec3, event: unknown) => void): this;
    onHover(cb: (isHovering: boolean, event: unknown) => void): this;

    destroy(): void;
}

/**
 * Interface representing an interactive line segment handle.
 */
export interface IGizmoLineHandle {
    readonly name: string;
    readonly node: Node | null;
    readonly index: number;

    updatePoints(p0: Vec3 | Vec2, p1: Vec3 | Vec2): void;
    setVisible(visible: boolean): void;
    onClick(cb: (clampedWorldHit: Vec3, edgeIndex: number, event: unknown) => void): this;
    destroy(): void;
}

export interface GizmoLineHandleOptions {
    name?: string;
    color?: Color;
    hoverColor?: Color;
    index?: number;
}

export interface GizmoHandleOptions {
    name?: string;
    size?: number;
    color?: Color;
    hoverColor?: Color;
}

interface EditorGizmoGlobal {
    Draw: new (owner: unknown) => IGizmoDraw;
    Handle: new (owner: unknown, opt?: GizmoHandleOptions) => IGizmoHandle;
    LineHandle: new (owner: unknown, opt?: GizmoLineHandleOptions) => IGizmoLineHandle;
    SvgGizmo?: {
        SvgGizmoManager: { clear(): void; updateAll(): void };
        SvgPolygonGizmo: new (target: unknown, opt?: unknown) => { destroy(): void; rebuild(): void; updateSvg(): void };
    };
    register(target: unknown, gizmoCtor: unknown, tier?: string): boolean;
    unregister(target: unknown, tier?: string): boolean;
    Registry: {
        list(): string[];
    };
}

interface CceEngineGlobal {
    Gizmo?: {
        gizmoRootNode?: Node;
    };
    Engine?: {
        repaintInEditMode(): void;
    };
    Utils?: {
        recordChanges(uuids: string[]): string;
        commitChanges(): void;
        onNodeChanged(node: Node, info: { type: string }): void;
    };
    EditorGizmo?: EditorGizmoGlobal;
}

declare const cce: CceEngineGlobal | undefined;

function getGlobalEditorGizmo(): EditorGizmoGlobal | null {
    if (typeof globalThis !== 'undefined') {
        const g = globalThis as unknown as { EditorGizmo?: EditorGizmoGlobal };
        if (g.EditorGizmo) return g.EditorGizmo;
    }
    if (typeof cce !== 'undefined' && cce && cce.EditorGizmo) {
        return cce.EditorGizmo;
    }
    if (typeof require === 'function') {
        try {
            const mod = require('E:/__pTSern/KingdomMatch/extensions/pts-core/src/gizmo') as {
                GizmoDraw: new (owner: unknown) => IGizmoDraw;
                GizmoHandle: new (owner: unknown, opt?: GizmoHandleOptions) => IGizmoHandle;
                GizmoLineHandle: new (owner: unknown, opt?: GizmoLineHandleOptions) => IGizmoLineHandle;
                SvgGizmo: {
                    SvgGizmoManager: { clear(): void; updateAll(): void };
                    SvgPolygonGizmo: new (target: unknown, opt?: unknown) => { destroy(): void; rebuild(): void; updateSvg(): void };
                };
                GizmoRegistry: {
                    register(target: unknown, gizmoCtor: unknown, tier?: string): boolean;
                    unregister(target: unknown, tier?: string): boolean;
                    list(): string[];
                };
            };
            return {
                Draw: mod.GizmoDraw,
                Handle: mod.GizmoHandle,
                LineHandle: mod.GizmoLineHandle,
                SvgGizmo: mod.SvgGizmo,
                register: mod.GizmoRegistry.register.bind(mod.GizmoRegistry),
                unregister: mod.GizmoRegistry.unregister.bind(mod.GizmoRegistry),
                Registry: mod.GizmoRegistry,
            };
        } catch {}
    }
    return null;
}

/**
 * Base class for all custom scene gizmos in Cocos Creator 3.8.8.
 * Inherit from this class and override lifecycle methods (`onUpdate`, `init`, etc.).
 */
export abstract class EditorGizmo<T extends Component = Component> {
    protected _hidden = true;
    protected _target: T;
    protected _isInitialized = false;
    protected _handles: IGizmoHandle[] = [];
    protected _lineHandles: IGizmoLineHandle[] = [];
    protected _draw: IGizmoDraw | null = null;
    public shouldRegisterGizmoOperationEvent = false;

    constructor(target: T) {
        this._target = target;
    }

    public get target(): T {
        return this._target;
    }

    public set target(value: T) {
        this._target = value;
        try {
            if (this.onTargetUpdate && this.checkVisible()) {
                this.onTargetUpdate();
                if (typeof cce !== 'undefined' && cce.Engine) {
                    cce.Engine.repaintInEditMode();
                }
            }
            if (this.nodes.length <= 0) {
                this.hide();
            }
        } catch (err) {
            console.error('[EditorGizmo.setTarget] Error:', err);
        }
    }

    public get node(): Node {
        return this._target ? this._target.node : null!;
    }

    public get nodes(): Node[] {
        return this._target && this._target.node ? [this._target.node] : [];
    }

    public get draw(): IGizmoDraw {
        if (!this._draw) {
            const globalRef = getGlobalEditorGizmo();
            if (globalRef && globalRef.Draw) {
                this._draw = new globalRef.Draw(this);
            }
        }
        return this._draw!;
    }

    public set draw(value: IGizmoDraw) {
        this._draw = value;
    }

    public layer(): string {
        return 'scene';
    }

    public getGizmoRoot(): Node | null {
        try {
            if (typeof cce !== 'undefined' && cce.Gizmo && cce.Gizmo.gizmoRootNode) {
                return cce.Gizmo.gizmoRootNode;
            }
        } catch {}
        return null;
    }

    public checkVisible(): boolean {
        return true;
    }

    public visible(): boolean {
        return !this._hidden;
    }

    public initialize(): void {
        if (this._isInitialized) return;
        this._isInitialized = true;
        try {
            this.init();
        } catch (err) {
            console.error('[EditorGizmo.init] Error:', err);
        }
    }

    public show(): void {
        try {
            if (this._hidden && this.checkVisible()) {
                this.initialize();
                try {
                    this.onShow();
                } catch (err) {
                    console.error('[EditorGizmo.onShow] Error:', err);
                }
                this._hidden = false;
                for (const h of this._handles) {
                    h.setVisible(true);
                }
                for (const h of this._lineHandles) {
                    h.setVisible(true);
                }
                if (typeof cce !== 'undefined' && cce.Engine) {
                    cce.Engine.repaintInEditMode();
                }
            }
        } catch (err) {
            console.error('[EditorGizmo.show] Error:', err);
        }
    }

    public hide(): void {
        try {
            if (!this._hidden) {
                try {
                    this.onHide();
                } catch (err) {
                    console.error('[EditorGizmo.onHide] Error:', err);
                }
                this._hidden = true;
                for (const h of this._handles) {
                    h.setVisible(false);
                }
                for (const h of this._lineHandles) {
                    h.setVisible(false);
                }
                if (typeof cce !== 'undefined' && cce.Engine) {
                    cce.Engine.repaintInEditMode();
                }
            }
        } catch (err) {
            console.error('[EditorGizmo.hide] Error:', err);
        }
    }

    public update(dt: number): void {
        try {
            if (!this.checkVisible() || !this.target || !this.node || !this.node.isValid) return;
            this.onUpdate(dt);
        } catch (err) {
            console.error('[EditorGizmo.onUpdate] Error:', err);
        }
    }

    public destroy(): void {
        try {
            try {
                this.onDestroy();
            } catch (err) {
                console.error('[EditorGizmo.onDestroy] Error:', err);
            }
            this.clearHandles();
            this.clearLineHandles();
            this.hide();
            this._target = null!;
        } catch (err) {
            console.error('[EditorGizmo.destroy] Error:', err);
        }
    }

    /**
     * Called once when the gizmo instance is created and initialized.
     * Use this hook to create interactive handles.
     */
    public init(): void {}

    /**
     * Called when the target node is selected and the gizmo becomes visible.
     */
    public onShow(): void {}

    /**
     * Called when the target node is unselected and the gizmo is hidden.
     */
    public onHide(): void {}

    /**
     * Called on every frame in the editor while the gizmo is active.
     * Use `this.draw` here to render immediate-mode wireframes.
     */
    public onUpdate(dt: number): void {}

    /**
     * Called when component properties are updated or changed in the Inspector.
     */
    public onTargetUpdate(): void {}

    /**
     * Called when the node transform (position, rotation, scale) changes.
     */
    public onNodeChanged(info: unknown): void {}

    /**
     * Called when the gizmo is being destroyed.
     */
    public onDestroy(): void {}

    /**
     * Creates an interactive 3D drag handle under the gizmo root node.
     */
    public createHandle(options?: GizmoHandleOptions): IGizmoHandle {
        try {
            const globalRef = getGlobalEditorGizmo();
            if (globalRef && globalRef.Handle) {
                const handle = new globalRef.Handle(this, options);
                this._handles.push(handle);
                return handle;
            }
        } catch (err) {
            console.error('[EditorGizmo.createHandle] Error:', err);
        }
        return null!;
    }

    /**
     * Purges all handles created by this gizmo.
     */
    public clearHandles(): void {
        for (const h of this._handles) {
            try {
                h.destroy();
            } catch (err) {
                console.error('[EditorGizmo.clearHandles] Error destroying handle:', err);
            }
        }
        this._handles.length = 0;
    }

    /**
     * Creates an interactive clickable line handle under the gizmo root node.
     */
    public createLineHandle(options?: GizmoLineHandleOptions): IGizmoLineHandle {
        try {
            const globalRef = getGlobalEditorGizmo();
            if (globalRef && globalRef.LineHandle) {
                const handle = new globalRef.LineHandle(this, options);
                this._lineHandles.push(handle);
                return handle;
            }
        } catch (err) {
            console.error('[EditorGizmo.createLineHandle] Error:', err);
        }
        return null!;
    }

    /**
     * Purges all line handles created by this gizmo.
     */
    public clearLineHandles(): void {
        for (const h of this._lineHandles) {
            try {
                h.destroy();
            } catch (err) {
                console.error('[EditorGizmo.clearLineHandles] Error destroying line handle:', err);
            }
        }
        this._lineHandles.length = 0;
    }

    /**
     * Returns active line handles owned by this gizmo.
     */
    public getLineHandles(): IGizmoLineHandle[] {
        return this._lineHandles;
    }

    /**
     * Returns active interactive handles owned by this gizmo.
     */
    public getHandles(): IGizmoHandle[] {
        return this._handles;
    }

    /**
     * Begins an undo transaction before modifying component properties.
     */
    public recordChanges(): void {
        try {
            if (typeof cce !== 'undefined' && cce.Utils && typeof cce.Utils.recordChanges === 'function') {
                cce.Utils.recordChanges(this.nodes.map((n) => n.uuid));
            }
        } catch (err) {
            console.error('[EditorGizmo.recordChanges] Error:', err);
        }
    }

    /**
     * Commits the undo transaction after modifying component properties.
     */
    public commitChanges(): void {
        try {
            if (typeof cce !== 'undefined' && cce.Utils && typeof cce.Utils.commitChanges === 'function') {
                cce.Utils.commitChanges();
            }
        } catch (err) {
            console.error('[EditorGizmo.commitChanges] Error:', err);
        }
    }

    /**
     * Notifies the editor that component properties have changed, triggering Inspector repaint.
     */
    public onComponentChanged(node?: Node): void {
        try {
            const targetNode = node || this.node;
            if (!targetNode) return;
            if (typeof cce !== 'undefined') {
                if (cce.Utils && typeof cce.Utils.onNodeChanged === 'function') {
                    cce.Utils.onNodeChanged(targetNode, { type: 'component-changed' });
                }
                if (cce.Engine && typeof cce.Engine.repaintInEditMode === 'function') {
                    cce.Engine.repaintInEditMode();
                }
            }
        } catch (err) {
            console.error('[EditorGizmo.onComponentChanged] Error:', err);
        }
    }
}

/**
 * Decorator to attach a custom EditorGizmo to a Component class.
 *
 * @example
 * ```ts
 * @ccclass('MyComponent')
 * @gizmo(MyComponentGizmo)
 * export class MyComponent extends Component { ... }
 * ```
 */
export function gizmo(
    gizmoCtor: new (target: unknown) => unknown,
    options?: { tier?: 'component' | 'persistent' | 'icon' }
) {
    return function <TFunction extends Function>(target: TFunction): void {
        const tier = (options && options.tier) || 'component';
        const key = Symbol.for('__pts_gizmo__');
        const targetRecord = target as unknown as Record<string | symbol, unknown>;
        targetRecord[key] = { gizmoCtor, tier };
        targetRecord.__pts_gizmo__ = { gizmoCtor, tier };

        if (EDITOR) {
            const globalRef = getGlobalEditorGizmo();
            if (globalRef) {
                try {
                    globalRef.register(target, gizmoCtor, tier);
                } catch (err) {
                    console.error('[pTS-Gizmo] Failed to register gizmo via decorator:', err);
                }
            }
        }
    };
}

/**
 * Helper namespace for programmatic gizmo registration and query.
 */
export namespace pGizmo {
    export function register(
        componentClassOrName: (new (...args: unknown[]) => Component) | string,
        gizmoCtor: new (target: unknown) => unknown,
        tier: 'component' | 'persistent' | 'icon' = 'component'
    ): boolean {
        if (EDITOR) {
            const globalRef = getGlobalEditorGizmo();
            if (globalRef) {
                return globalRef.register(componentClassOrName, gizmoCtor, tier);
            }
        }
        return false;
    }

    export function unregister(
        componentClassOrName: (new (...args: unknown[]) => Component) | string,
        tier: 'component' | 'persistent' | 'icon' = 'component'
    ): boolean {
        if (EDITOR) {
            const globalRef = getGlobalEditorGizmo();
            if (globalRef) {
                return globalRef.unregister(componentClassOrName, tier);
            }
        }
        return false;
    }

    export function list(): string[] {
        if (EDITOR) {
            const globalRef = getGlobalEditorGizmo();
            if (globalRef) {
                return globalRef.Registry.list();
            }
        }
        return [];
    }
}
