import { __private, _decorator, Asset, Director, director, CCClass, Component } from "cc";
import * as pDriver from "./utils/pDriver";
import { pArray, pString } from "./utils";
import { editor_property, implement, imps, getComponent } from "./utils/pClass";
import { CC_IEnumList } from "./interfaces/cc/CC.IEnumable";

export { EditorGizmo, gizmo, pGizmo } from "./utils/pGizmo";
export { MaskPolygon, MaskPolygonGizmo } from "./Components/Renderer/MaskPolygon";
export { MeshPolygonSprite, MeshPolygonSpriteGizmo } from "./Components/Renderer/MeshPolygonSprite";
export type pTS_TMenuOption = string | { path: string; priority?: number; hide?: boolean } | boolean;

/**
 * Decorator to define the menu path for creating this pTSAsset in the Assets Create menu.
 * Example: @pTSAsset.menu("A/B/C") or @menu("A/B/C")
 */
export function menu(opt: pTS_TMenuOption) {
    return function (target: any) {
        if (!target) return target;
        let _paths: string | undefined = undefined;
        let _hide = false;
        let _priority: number | undefined = undefined;

        if (typeof opt === 'string') {
            _paths = opt.trim();
        } else if (typeof opt === 'boolean') {
            _hide = !opt;
        } else if (opt && typeof opt === 'object') {
            if (opt.hide) _hide = true;
            if (opt.path) _paths = opt.path.trim();
            if (typeof opt.priority === 'number') _priority = opt.priority;
        }

        if (_hide) {
            target._pts_menu_hide = true;
            target._pts_menu = '';
        } else if (_paths) {
            target._pts_menu = _paths;
            target.__menu__ = _paths;
            if (_priority !== undefined) target._pts_menu_priority = _priority;
            try {
                if (typeof CCClass !== 'undefined' && CCClass.Attr) {
                    CCClass.Attr.setClassAttr(target, '', 'menu', _paths);
                }
            } catch {}
        }
        return target;
    };
}

// Guard against Cocos warning 3623 ("Can not use 'editor' attribute, '%s' not inherits from Components")
// Cocos Creator's _decorator.menu writes into cache.proto.editor.menu which is only valid for Components.
// If _decorator.menu is used on a non-Component (e.g. pTSAsset), intercept it, route to pTSAsset.menu,
// and clean up cache.proto.editor so CCClass won't emit warning 3623.
if (typeof _decorator !== 'undefined' && typeof _decorator.menu === 'function') {
    const origDecoratorMenu = _decorator.menu as unknown as ((opt: pTS_TMenuOption) => ClassDecorator) & { __pts_hooked__?: boolean };
    if (!origDecoratorMenu.__pts_hooked__) {
        const hookedMenu = function (opt: pTS_TMenuOption) {
            const origDec = origDecoratorMenu(opt);
            return function (target: Function) {
                if (!target) return target;
                const isComp = (target as unknown) === Component || (target.prototype && target.prototype instanceof Component);
                if (isComp) {
                    return origDec(target);
                }
                menu(opt)(target);
                try {
                    const cacheKey = '[[ccclass_cache]]';
                    const cache = (target as any)[cacheKey] as { proto?: { editor?: Record<string, unknown> } } | undefined;
                    if (cache?.proto?.editor) {
                        delete cache.proto.editor.menu;
                        if (Object.keys(cache.proto.editor).length === 0) {
                            delete cache.proto.editor;
                        }
                    }
                } catch {}
                return target;
            };
        };
        hookedMenu.__pts_hooked__ = true;
        (_decorator as unknown as Record<string, unknown>).menu = hookedMenu;
    }
}

export { implement, imps, getComponent };

const { ccclass } = _decorator;

const _hydratePromise_ = Symbol('_hydratePromise_');
const _readyDeferredResolve_ = Symbol('_readyDeferredResolve_');
const _readyDeferredPromise_ = Symbol('_readyDeferredPromise_');

@ccclass("pTSAsset")
export abstract class pTSAsset<_TInterfaces extends Record<string, any> = { any: pFlex.TFunc }> extends Asset {
    static menu(menuOption: pTS_TMenuOption) {
        return menu(menuOption);
    }

    protected static _bounces: string[] = [];
    static CCEvents(target: pTSAsset) {
        if(!target) return [];
        const _out = target.constructor['_bounces'] || [];
        return CC_IEnumList.generator(['any', ..._out]);
    }

    protected _onLoad?(): void;
    protected _onReleased?(): void;

    @editor_property()
    protected _isLoaded: boolean = false;

    private [_readyDeferredResolve_]: (() => void) | null = null;
    private [_readyDeferredPromise_]: Promise<void> | null = null;

    static clone<_T extends pTSAsset>(a: pFlex.TArray<_T>, ...b: _T[]): _T[] {
        b = pArray.flat(a, b);

        return b.map(_asset => _asset.clone());
    }

    static add(assets: pFlex.TArray<pTSAsset>, func: pFlex.TArray<pFlex.THandler>, ...funcs: pFlex.THandler[]) {
        assets = pArray.flatter(assets);
        funcs = pArray.flat(func, funcs);

        for(const _asset of assets) {
            _asset._driver.on('any', ...funcs);
        }
    }

    static wait(asset: pFlex.TArray<pTSAsset>, ...assets: pTSAsset[]) {
        assets = pArray.flat(asset, assets);
        return Promise.all(assets.map(_asset => _asset.ready));
    }

    static remove(assets: pFlex.TArray<pTSAsset>, funcs: pFlex.TArray<pFlex.THandler>) {
        assets = pArray.flatter(assets);
        funcs = pArray.flatter(funcs);

        for(const _asset of assets) {
            _asset._driver.off('any', ...funcs);
        }
    }

    get ready(): Promise<void> {
        if (this[_hydratePromise_]) {
            return this[_hydratePromise_];
        }
        if (this._isLoaded) {
            return Promise.resolve();
        }
        if (!this[_readyDeferredPromise_]) {
            this[_readyDeferredPromise_] = new Promise<void>((resolve) => {
                this[_readyDeferredResolve_] = resolve;
            });
        }
        return this[_readyDeferredPromise_];
    }

    protected hydrate(depsPromise?: Promise<any>): Promise<void> {
        if (this._isLoaded) {
            if (depsPromise && this[_hydratePromise_]) {
                this[_hydratePromise_] = Promise.all([this[_hydratePromise_], depsPromise]).then(() => {});
            }
            return this[_hydratePromise_] || Promise.resolve();
        }
        this._isLoaded = true;

        const scenePromise = new Promise<void>((resolve) => {
            if (director.getScene()) {
                resolve();
            } else {
                director.once(Director.EVENT_AFTER_SCENE_LAUNCH, () => resolve(), this);
            }
        });

        const _ready = Promise.all([scenePromise, depsPromise || Promise.resolve()]).then(async () => {
            try {
                await this._onAwake?.();
            } catch (err) {
                console.error(`[pTSAsset] Error in _onAwake for ${(this as any).name || this.constructor.name}:`, err);
            }
        }).then(() => {
            if (this[_readyDeferredResolve_]) {
                this[_readyDeferredResolve_]();
                this[_readyDeferredResolve_] = null;
            }
        });

        this[_hydratePromise_] = _ready;

        this._onLoad?.();
    }
    protected _driver = pDriver.Handler.create<_TInterfaces>();

    //@ts-ignore
    override on<_TKey extends keyof _TInterfaces>(key: _TKey, func: _TInterfaces[_TKey], binder: any): void {
        this._driver.on(key, { func, binder });
    }

    //@ts-ignore
    override once<_TKey extends keyof _TInterfaces>(key: _TKey, func: _TInterfaces[_TKey], binder: any): void {
        this._driver.once(key, { func, binder });
    }

    //@ts-ignore
    override off<_TKey extends keyof _TInterfaces>(key: _TKey, callback: _TInterfaces[_TKey], binder: any): void {
        this._driver.off(key as any, callback, binder);
    }

    //@ts-ignore
    override emit<_TKey extends keyof _TInterfaces>(type: _TKey, ..._params: Parameters<_TInterfaces[_TKey]>) {
        return this._driver.emit(type, ..._params);
    }

    clean<_TKey extends keyof _TInterfaces>(key: pFlex.TArray<_TKey>, ...keys: _TKey[]) {
        keys = pArray.flat(key, keys);
        for(const _key of keys) {
            this._driver.clear(_key);
        }
    }

    flush() {
        this._driver.flush();
    }

    destroy(): boolean {
        const _out = super.destroy();
        this._onReleased?.();
        return _out;
    }

    protected _onAwake?(): void | Promise<void>;

    /**
     * Declared hook invoked when this .pts asset is focused in the Inspector.
     * Subclasses can declare and implement this method.
     */
    onFocusInEditor?(): void;

    notifyFocusInEditor(): void {
        try {
            this.onFocusInEditor?.();
        } catch (err) {
            console.error(`[pTSAsset] Error in onFocusInEditor for ${(this as any).name || this.constructor.name}:`, err);
        }
    }

    /**
     * Creates an independent deep-cloned runtime instance of this pTSAsset.
     * The clone is completely separate: destroying the original will not destroy the clone.
     */
    clone(): this {
        const ctor = this.constructor as new () => this;
        const cloned = new ctor();

        // Assign a distinct runtime UUID and cloned name
        const newUuid = pString?.uuid ? pString.uuid() : `${this.uuid}_clone_${Date.now()}`;
        (cloned as any)._uuid = newUuid;
        cloned.name = this.name ? `${this.name}_clone` : `${ctor.name}_clone`;

        // Deep copy properties from this to cloned
        _$deepCloneProperties(this, cloned);

        // Fresh event driver and runtime load state
        cloned._driver = pDriver.Handler.create();
        (cloned as any)._isLoaded = true;

        try {
            (cloned as any)._onLoad?.();
            (cloned as any)._onCloned?.(this);
        } catch (e) {
            console.error(`[pTSAsset] Error during clone initialization for ${(cloned as any).name}:`, e);
        }

        return cloned;
    }

    /**
     * Optional lifecycle hook called on a freshly cloned instance after its properties are populated.
     */
    protected _onCloned?(original: this): void;
}

function _$cloneValue(val: any, seen: Map<any, any>, depth = 0): any {
    if (depth > 12) return val;
    if (val === null || val === undefined) return val;
    if (typeof val === 'number' || typeof val === 'string' || typeof val === 'boolean' || typeof val === 'bigint' || typeof val === 'symbol') {
        return val;
    }
    if (typeof val === 'function') return val;

    // Cycle detection
    if (seen.has(val)) {
        return seen.get(val);
    }

    // pTSAsset: recursive deep clone
    if (val instanceof pTSAsset) {
        const clonedAsset = val.clone();
        seen.set(val, clonedAsset);
        return clonedAsset;
    }

    // Cocos math / objects with custom clone() method (Vec2, Vec3, Color, Rect, Size, Quat, Mat4, etc.)
    if (typeof val.clone === 'function') {
        try {
            const clonedMath = val.clone();
            seen.set(val, clonedMath);
            return clonedMath;
        } catch {}
    }

    // Array
    if (Array.isArray(val)) {
        const clonedArr: any[] = [];
        seen.set(val, clonedArr);
        for (let i = 0; i < val.length; i++) {
            clonedArr[i] = _$cloneValue(val[i], seen, depth + 1);
        }
        return clonedArr;
    }

    // Set
    if (val instanceof Set) {
        const clonedSet = new Set();
        seen.set(val, clonedSet);
        for (const item of val) {
            clonedSet.add(_$cloneValue(item, seen, depth + 1));
        }
        return clonedSet;
    }

    // Map
    if (val instanceof Map) {
        const clonedMap = new Map();
        seen.set(val, clonedMap);
        for (const [k, v] of val) {
            clonedMap.set(k, _$cloneValue(v, seen, depth + 1));
        }
        return clonedMap;
    }

    // Non-pTSAsset Cocos Assets (textures, prefabs, materials), Scene Nodes, and Components
    // are shared by reference, not duplicated.
    if (val instanceof Asset || (val && typeof val === 'object' && ('_objFlags' in val && '_parent' in val))) {
        return val;
    }

    // Plain object
    try {
        const proto = Object.getPrototypeOf(val);
        const clonedObj: any = proto && proto !== Object.prototype ? Object.create(proto) : {};
        seen.set(val, clonedObj);
        for (const key of Object.keys(val)) {
            if (key.startsWith('_$') || key.startsWith('_driver')) continue;
            clonedObj[key] = _$cloneValue(val[key], seen, depth + 1);
        }
        return clonedObj;
    } catch {
        return val;
    }
}

function _getPropertyDescriptor(obj: any, prop: string): PropertyDescriptor | undefined {
    let cur = obj;
    while (cur && cur !== Object.prototype && cur !== Asset.prototype) {
        const desc = Object.getOwnPropertyDescriptor(cur, prop);
        if (desc) return desc;
        cur = Object.getPrototypeOf(cur);
    }
    return undefined;
}

function _$deepCloneProperties(src: any, dst: any): void {
    const seen = new Map<any, any>();
    seen.set(src, dst);

    const ctor = src.constructor;
    const skippedKeys = new Set([
        '_uuid', 'uuid', 'name', '_objFlags', '_ref',
        '_driver', '_isLoaded', '_rawFiles', '_native', '_nativeUrl', '_file',
    ]);

    const keysToCopy = new Set<string>();

    // 1. Own property names
    for (const k of Object.getOwnPropertyNames(src)) {
        if (k.startsWith('_driver') || skippedKeys.has(k) || k.startsWith('_$')) continue;
        keysToCopy.add(k);
    }

    // 2. CCClass registered properties
    if (ctor && Array.isArray((ctor as any).__props__)) {
        for (const p of (ctor as any).__props__) {
            if (p.startsWith('_driver') || skippedKeys.has(p) || p.startsWith('_$')) continue;
            keysToCopy.add(p);
        }
    }

    // 3. Editor properties
    const editorProps = (ctor && (ctor as any).__editor_props__) || src.__editor_props__;
    if (editorProps && typeof editorProps === 'object') {
        for (const ep of Object.keys(editorProps)) {
            if (ep.startsWith('_driver') || skippedKeys.has(ep) || ep.startsWith('_$')) continue;
            keysToCopy.add(ep);
        }
    }

    // 4. Copy each property
    for (const key of keysToCopy) {
        try {
            const desc = _getPropertyDescriptor(src, key);
            // Getter-only on prototype without setter: copy backing field if exists
            if (desc && desc.get && !desc.set) {
                const backingKey = '_' + key;
                if (backingKey in src) {
                    (dst as any)[backingKey] = _$cloneValue((src as any)[backingKey], seen);
                }
                continue;
            }

            const val = src[key];
            if (typeof val === 'function') continue;

            const clonedVal = _$cloneValue(val, seen);
            (dst as any)[key] = clonedVal;

            // Sync backing field if exists
            const backingKey = '_' + key;
            if (backingKey in dst && !(backingKey in src)) {
                try {
                    (dst as any)[backingKey] = clonedVal;
                } catch {}
            }
        } catch {
            // Ignore unassignable properties
        }
    }
}

