import { __private, _decorator, Asset, Director, director, assetManager } from "cc";
import { BUILD } from "cc/env";
import * as pDriver from "./utils/pDriver";
import * as pConst from "./utils/pConst";
import { IS_TEST } from "./utils/pConst";
import { pArray } from "./utils";
import { editor_property, implement, imps } from "./utils/pClass";

export { implement, imps };

const { ccclass } = _decorator;

const _hydratePromise_ = Symbol('_hydratePromise_');

@ccclass("pTSAsset")
export class pTSAsset<_TInterfaces extends Record<string, any> = { any: pFlex.TFunc }> extends Asset {
    protected _onLoad?(): void;
    protected _onReleased?(): void;

    @editor_property()
    protected _isLoaded: boolean = false;

    static add(assets: pFlex.TArray<pTSAsset>, func: pFlex.TArray<pFlex.THandler>, ...funcs: pFlex.THandler[]) {
        assets = pArray.flatter(assets);
        funcs = pArray.flat(func, funcs);

        for(const _asset of assets) {
            _asset._driver.on('any', ...funcs);
        }
    }

    static remove(assets: pFlex.TArray<pTSAsset>, funcs: pFlex.TArray<pFlex.THandler>) {
        assets = pArray.flatter(assets);
        funcs = pArray.flatter(funcs);

        for(const _asset of assets) {
            _asset._driver.off('any', ...funcs);
        }
    }

    get ready(): Promise<void> {
        if (!this[_hydratePromise_]) {
            if (!this._isLoaded) {
                this.hydrate();
            } else {
                return Promise.resolve();
            }
        }
        return this[_hydratePromise_] || Promise.resolve();
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
        });

        this[_hydratePromise_] = _ready;

        this._onLoad?.();
        if (!BUILD && pConst.EDITOR_ONLY_IN_PREVIEW) {
            globalThis['_$pTSAssets'] = globalThis['_$pTSAssets'] || {};
            globalThis['_$pTSAssets'][this.name] = globalThis['_$pTSAssets'][this.name] || {};
            globalThis['_$pTSAssets'][this.name][this.uuid] = this;

            globalThis['__pTS_LIVE_ASSETS__'] = globalThis['__pTS_LIVE_ASSETS__'] || new Map<string, any>();
            const rawUuid = (this as any)._uuid || this.uuid;
            if (rawUuid) {
                globalThis['__pTS_LIVE_ASSETS__'].set(rawUuid, this);
            }

            _ensurePreviewSyncTicker();
            _ensurePreviewListener();
            _syncPreviewSnapshot();
        } else if (IS_TEST) {
            globalThis['_$pTSAssets'] = globalThis['_$pTSAssets'] || {};
            globalThis['_$pTSAssets'][this.name] = globalThis['_$pTSAssets'][this.name] || {};
            globalThis['_$pTSAssets'][this.name][this.uuid] = this;
        }
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

    destroy(): boolean {
        if (!BUILD && pConst.EDITOR_ONLY_IN_PREVIEW) {
            const rawUuid = (this as any)._uuid || this.uuid;
            if (rawUuid && globalThis['__pTS_LIVE_ASSETS__']) {
                globalThis['__pTS_LIVE_ASSETS__'].delete(rawUuid);
            }
            if (this.name && globalThis['_$pTSAssets'] && globalThis['_$pTSAssets'][this.name]) {
                delete globalThis['_$pTSAssets'][this.name][this.uuid];
            }
            _syncPreviewSnapshot();
        }
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
}

function _safeSerializeValue(val: any, depth: number = 0): any {
    if (depth > 5) return undefined;
    if (val === null || val === undefined) return val;
    if (typeof val === 'number' || typeof val === 'string' || typeof val === 'boolean') return val;
    if (typeof val === 'bigint') return Number(val);
    if (typeof val === 'function' || typeof val === 'symbol') return undefined;

    // Asset reference
    if (val instanceof Asset || (val && typeof val === 'object' && typeof (val as any)._uuid === 'string')) {
        return { uuid: (val as any)._uuid || (val as any).uuid };
    }

    // Array
    if (Array.isArray(val)) {
        return val.map(item => _safeSerializeValue(item, depth + 1));
    }

    // Object
    if (typeof val === 'object') {
        const out: Record<string, any> = {};
        for (const k of Object.keys(val)) {
            if (k.startsWith('_$') || k.startsWith('_driver')) continue;
            const res = _safeSerializeValue(val[k], depth + 1);
            if (res !== undefined) {
                out[k] = res;
            }
        }
        return out;
    }

    return undefined;
}

function _hasProperty(obj: any, prop: string): boolean {
    if (!obj) return false;
    try {
        if (prop in obj) return true;
    } catch {}
    let cur = obj;
    while (cur && cur !== Object.prototype && cur !== Asset.prototype) {
        if (Object.prototype.hasOwnProperty.call(cur, prop)) return true;
        cur = Object.getPrototypeOf(cur);
    }
    return false;
}

function _filterEditorProps(inst: any): Record<string, any> {
    const rawEp = (inst?.constructor && (inst.constructor as any).__editor_props__) || (inst as any)?.__editor_props__;
    const epMeta: Record<string, any> = {};
    if (rawEp && typeof rawEp === 'object') {
        for (const [k, v] of Object.entries(rawEp)) {
            if (_hasProperty(inst, k) || (inst.constructor?.prototype && _hasProperty(inst.constructor.prototype, k))) {
                epMeta[k] = v;
            }
        }
    }
    return epMeta;
}

function _extractInstanceValues(instance: any): Record<string, any> {
    const values: Record<string, any> = {};
    if (!instance) return values;

    const ctor = instance.constructor;

    // 1. Extract own properties
    for (const k of Object.keys(instance)) {
        if (k.startsWith('_driver') || k === '_isLoaded' || k === '_rawFiles' || k === '_native' || k.startsWith('_$')) continue;
        if (k === 'name' || k === 'uuid' || k === '_uuid' || k === '_objFlags') continue;
        try {
            const v = instance[k];
            if (typeof v === 'function' || typeof v === 'symbol') continue;
            const s = _safeSerializeValue(v);
            if (s !== undefined) values[k] = s;
        } catch {}
    }

    // 2. Extract @property fields / registered cc props
    if (ctor && Array.isArray((ctor as any).__props__)) {
        for (const p of (ctor as any).__props__) {
            if (p.startsWith('_driver') || p === '_isLoaded' || p === '_rawFiles' || p === '_native' || p.startsWith('_$')) continue;
            if (p === 'name' || p === 'uuid' || p === '_uuid' || p === '_objFlags') continue;
            try {
                const v = instance[p];
                if (typeof v === 'function' || typeof v === 'symbol') continue;
                const s = _safeSerializeValue(v);
                if (s !== undefined) values[p] = s;
            } catch {}
        }
    }

    // 3. Extract @editor_property fields (including getters on prototype)
    const editorProps = _filterEditorProps(instance);
    for (const epKey of Object.keys(editorProps)) {
        try {
            const v = instance[epKey];
            if (typeof v === 'function' || typeof v === 'symbol') continue;
            const s = _safeSerializeValue(v);
            if (s !== undefined) values[epKey] = s;
        } catch {}
    }

    // 4. Walk prototype getters (to catch any getter properties like passed)
    let currProto = Object.getPrototypeOf(instance);
    while (currProto && currProto !== Object.prototype && currProto !== Asset.prototype) {
        const descs = Object.getOwnPropertyDescriptors(currProto);
        for (const [propName, desc] of Object.entries(descs)) {
            if (desc.get && typeof desc.get === 'function' && !propName.startsWith('_') && !(propName in values)) {
                try {
                    const v = instance[propName];
                    if (typeof v !== 'function' && typeof v !== 'symbol') {
                        const s = _safeSerializeValue(v);
                        if (s !== undefined) values[propName] = s;
                    }
                } catch {}
            }
        }
        currProto = Object.getPrototypeOf(currProto);
    }

    return values;
}

let _previewSyncTimer: any = null;

function _syncPreviewSnapshot() {
    if (BUILD || !pConst.EDITOR_ONLY_IN_PREVIEW) return;

    const pTSAssets = globalThis['_$pTSAssets'];
    const liveMap: Map<string, any> = globalThis['__pTS_LIVE_ASSETS__'];
    if (!pTSAssets && !liveMap) return;

    const snapshot: Record<string, any> = {};

    // 1. Scan _$pTSAssets
    if (pTSAssets && typeof pTSAssets === 'object') {
        for (const name of Object.keys(pTSAssets)) {
            const byUuid = pTSAssets[name];
            if (byUuid && typeof byUuid === 'object') {
                for (const uuid of Object.keys(byUuid)) {
                    const inst = byUuid[uuid];
                    if (inst) {
                        try {
                            inst.onFocusInEditor?.();
                        } catch (err) {}
                        const vals = _extractInstanceValues(inst);
                        const epMeta = _filterEditorProps(inst);
                        snapshot[uuid] = {
                            uuid: uuid,
                            name: name,
                            values: vals,
                            editorProps: epMeta
                        };
                        if (!snapshot[name]) {
                            snapshot[name] = snapshot[uuid];
                        }
                    }
                }
            }
        }
    }

    // 2. Scan __pTS_LIVE_ASSETS__ Map
    if (liveMap && typeof liveMap.forEach === 'function') {
        liveMap.forEach((inst, uuid) => {
            if (inst && !snapshot[uuid]) {
                try {
                    inst.onFocusInEditor?.();
                } catch (err) {}
                const vals = _extractInstanceValues(inst);
                const name = (inst as any).name || (inst.constructor ? inst.constructor.name : '');
                const epMeta = _filterEditorProps(inst);
                snapshot[uuid] = {
                    uuid: uuid,
                    name: name,
                    values: vals,
                    editorProps: epMeta
                };
                if (name && !snapshot[name]) {
                    snapshot[name] = snapshot[uuid];
                }
            }
        });
    }

    // Send IPC via Editor.Message
    const editor = (globalThis as any).Editor || (typeof window !== 'undefined' && (window as any).Editor);
    if (editor && editor.Message && typeof editor.Message.send === 'function') {
        try {
            const cleanSnapshot = JSON.parse(JSON.stringify(snapshot));
            editor.Message.send('pts-asset', 'sync-preview-data', cleanSnapshot);
        } catch (err) {
            console.warn('[pTSAsset] Failed to send preview sync snapshot:', err);
        }
    }
}

function _ensurePreviewSyncTicker() {
    if (_previewSyncTimer || BUILD || !pConst.EDITOR_ONLY_IN_PREVIEW) return;

    _previewSyncTimer = setInterval(() => {
        try {
            _syncPreviewSnapshot();
        } catch (err) {
            console.error('[pTSAsset] Error in preview sync ticker:', err);
        }
    }, 200);
}

let _previewListenerAttached = false;

function _applyLivePropertyInPreview(info: { uuid: string; className?: string; propPath: string; newValue: any }) {
    if (!info || !info.uuid) return;

    let instance: any = null;
    const liveMap: Map<string, any> = globalThis['__pTS_LIVE_ASSETS__'];
    if (liveMap && typeof liveMap.get === 'function') {
        instance = liveMap.get(info.uuid);
    }
    if (!instance && globalThis['_$pTSAssets']) {
        const pTSAssets = globalThis['_$pTSAssets'];
        if (info.className && pTSAssets[info.className] && pTSAssets[info.className][info.uuid]) {
            instance = pTSAssets[info.className][info.uuid];
        } else {
            for (const cName in pTSAssets) {
                if (pTSAssets[cName] && pTSAssets[cName][info.uuid]) {
                    instance = pTSAssets[cName][info.uuid];
                    break;
                }
            }
        }
    }

    instance = assetManager.assets.get(info.uuid);
    if (!instance && assetManager.utils) {
        if (typeof assetManager.utils['decodeUuid'] === 'function') {
            instance = assetManager.assets.get(assetManager.utils['decodeUuid'](info.uuid));
        }
    }

    if (!instance) {
        console.warn(`[pTSAsset] Live instance not found in preview process for uuid: ${info.uuid}`);
        return;
    }

    const parts = String(info.propPath).split('.');
    let target = instance;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (target && target[part] !== undefined) {
            target = target[part];
        }
    }
    const propName = parts[parts.length - 1];
    if (!target) return;

    try {
        let valToAssign = info.newValue;
        if (typeof target[propName] === 'number' && typeof valToAssign === 'string' && !isNaN(Number(valToAssign))) {
            valToAssign = Number(valToAssign);
        }

        if (Array.isArray(target) && !isNaN(Number(propName))) {
            target[Number(propName)] = valToAssign;
        } else if (typeof instance.set === 'function' && propName === 'data') {
            instance.set(valToAssign, true);
        } else {
            target[propName] = valToAssign;
        }

        const backingKey = '_' + propName;
        if (target && (backingKey in target || target.hasOwnProperty(backingKey))) {
            try {
                target[backingKey] = valToAssign;
            } catch (e) {}
        }

        console.log(`[pTSAsset] Successfully updated runtime instance ${(instance as any).name || info.uuid}.${info.propPath} =`, valToAssign);
    } catch (err) {
        console.error(`[pTSAsset] Error setting property ${info.propPath} on runtime instance:`, err);
    }

    _syncPreviewSnapshot();
}

function _ensurePreviewListener() {
    if (_previewListenerAttached || BUILD || !pConst.EDITOR_ONLY_IN_PREVIEW) return;

    const editor = (globalThis as any).Editor || (typeof window !== 'undefined' && (window as any).Editor);
    if (!editor || !editor.Message) return;

    const handleSetProperty = (info: any) => {
        _applyLivePropertyInPreview(info);
    };

    try {
        if (typeof editor.Message.addBroadcastListener === 'function') {
            _previewListenerAttached = true;
            editor.Message.addBroadcastListener('pts-asset:set-runtime-property', handleSetProperty);
            console.log('[pTSAsset] Registered broadcast listener for pts-asset:set-runtime-property');
        } else if (typeof (editor.Message as any).on === 'function') {
            _previewListenerAttached = true;
            (editor.Message as any).on('pts-asset:set-runtime-property', handleSetProperty);
            console.log('[pTSAsset] Registered on listener for pts-asset:set-runtime-property');
        }
    } catch (err) {
        console.warn('[pTSAsset] Failed to attach preview broadcast listener:', err);
    }

    try {
        const electron = (globalThis as any).electron || (typeof window !== 'undefined' && ((window as any).electron || (typeof (window as any).require === 'function' && (window as any).require('electron'))));
        if (electron && electron.ipcRenderer && typeof electron.ipcRenderer.on === 'function') {
            electron.ipcRenderer.on('pts-asset:set-runtime-property', (_e: any, info: any) => {
                _applyLivePropertyInPreview(info);
            });
        }
    } catch {}
}
