import { _decorator, Component, Camera, Vec3, UITransform, director, sys, game } from 'cc';
const { ccclass, property, requireComponent } = _decorator;

const _worldPos = new Vec3();
const _screenMin = new Vec3();
const _screenMax = new Vec3();

/**
 * Creates an HTML DOM element that automatically syncs its position and size
 * with the attached node's UITransform in screen space.
 *
 * The DOM element is laid on top of the fullscreen Cocos canvas, visually
 * overlaying the node it is attached to. Useful for embedding HTML content
 * (iframes, input fields, ads, videos, etc.) that must track a game-world node.
 */
@ccclass('Dom_SyncNode')
@requireComponent(UITransform)
export class Dom_SyncNode extends Component {

    // ── Editor Properties ──────────────────────────────────────────────

    @property(Camera)
    public camera: Camera = null;

    /** HTML `id` attribute of the created DOM element. */
    @property({})
    did: string = 'pts__gd_banner__style';

    /** `id` of the parent container element. Falls back to `document.body`. */
    @property({})
    container: string = 'GameDiv';

    /**
     * Optional CSS class(es) applied to the element.
     * Allows external stylesheets to control appearance.
     */
    @property({})
    cssClass: string = '';

    /**
     * When `true`, pointer / touch events pass through to the canvas below.
     * Set to `false` if the DOM element itself should be interactive.
     */
    @property({})
    pointerPassThrough: boolean = true;

    /**
     * Base z-index for the DOM element.
     * Increase if the element appears behind other overlays.
     */
    @property({})
    zIndex: number = 100;

    // ── Runtime State ──────────────────────────────────────────────────

    private _domElement: HTMLDivElement | null = null;
    private _uiTransform: UITransform | null = null;

    // ── Lifecycle ──────────────────────────────────────────────────────

    protected __preload(): void {
        if (!sys.isBrowser) {
            this.destroy();
            return;
        }
    }

    onLoad() {
        if (!this.camera) {
            this.camera = director.getScene()?.getComponentInChildren(Camera) || null;
        }
        this._uiTransform = this.getComponent(UITransform);
        this._createDomElement();
    }

    onEnable() {
        if (this._domElement) {
            this._domElement.style.display = '';
        }
    }

    onDisable() {
        if (this._domElement) {
            this._domElement.style.display = 'none';
        }
    }

    lateUpdate() {
        this._syncDom();
    }

    onDestroy() {
        if (this._domElement?.parentNode) {
            this._domElement.parentNode.removeChild(this._domElement);
            this._domElement = null;
        }
    }

    // ── Public API ─────────────────────────────────────────────────────

    /** Returns the underlying HTMLDivElement (or null before onLoad). */
    public get domElement(): HTMLDivElement | null {
        return this._domElement;
    }

    // ── Internals ──────────────────────────────────────────────────────

    private _createDomElement() {
        const el = document.createElement('div');
        el.id = this.did;

        if (this.cssClass) {
            el.className = this.cssClass;
        }

        Object.assign(el.style, {
            position: 'absolute',
            boxSizing: 'border-box',
            pointerEvents: this.pointerPassThrough ? 'none' : 'auto',
            zIndex: `${this.zIndex}`,
            overflow: 'hidden',
        } as Partial<CSSStyleDeclaration>);

        const parent = document.getElementById(this.container) || document.body;
        parent.appendChild(el);
        this._domElement = el;
    }

    /**
     * Converts the node's world-space bounding box into screen-space pixels,
     * then maps that rect onto the DOM — laid directly on top of the
     * fullscreen canvas.
     */
    private _syncDom() {
        const el = this._domElement;
        const cam = this.camera;
        const uit = this._uiTransform;
        if (!el || !cam || !uit) return;

        const canvas = game.canvas;
        if (!canvas) return;

        // Ratio between canvas buffer pixels and CSS pixels (device pixel ratio)
        const dpr = canvas.width / canvas.clientWidth;
        const canvasH = canvas.height;

        // World-space axis-aligned bounding box of the node
        const rect = uit.getBoundingBoxToWorld();

        // Convert bottom-left corner → screen space
        _worldPos.set(rect.xMin, rect.yMin, 0);
        cam.worldToScreen(_worldPos, _screenMin);

        // Convert top-right corner → screen space
        _worldPos.set(rect.xMax, rect.yMax, 0);
        cam.worldToScreen(_worldPos, _screenMax);

        // Screen space (origin bottom-left, buffer pixels)
        //   → DOM space (origin top-left, CSS pixels)
        const domLeft   = _screenMin.x / dpr;
        const domTop    = (canvasH - _screenMax.y) / dpr;
        const domWidth  = (_screenMax.x - _screenMin.x) / dpr;
        const domHeight = (_screenMax.y - _screenMin.y) / dpr;

        el.style.left   = `${domLeft}px`;
        el.style.top    = `${domTop}px`;
        el.style.width  = `${domWidth}px`;
        el.style.height = `${domHeight}px`;
    }
}
