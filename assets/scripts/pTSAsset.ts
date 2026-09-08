import { __private, _decorator, Asset, Director, director } from "cc";
import { BUILD } from "cc/env";
import * as pDriver from "./utils/pDriver";
import * as pConst from "./utils/pConst";
import { IS_TEST } from "./utils/pConst";

const { ccclass } = _decorator;

@ccclass("pTSAsset")
export class pTSAsset<_TInterfaces extends Record<string, any> = Record<string, pFlex.TFunc>> extends Asset {
    protected _onLoad?(): void;
    protected _onReleased?(): void;
    protected _isLoaded: boolean = false;

    protected hydrate(depsPromise?: Promise<any>): void {
        if (this._isLoaded) return;
        this._isLoaded = true;

        const scenePromise = new Promise<void>((resolve) => {
            if (director.getScene()) {
                resolve();
            } else {
                director.once(Director.EVENT_AFTER_SCENE_LAUNCH, () => resolve(), this);
            }
        });

        const readyPromise = Promise.all([scenePromise, depsPromise || Promise.resolve()]);
        readyPromise.then(() => {
            try {
                this._onAwake?.();
            } catch (err) {
                console.error(`[pTSAsset] Error in _onAwake for ${(this as any).name || this.constructor.name}:`, err);
            }
        });

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

    protected _onAwake?(): void
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

function _extractInstanceValues(instance: any): Record<string, any> {
    const values: Record<string, any> = {};
    if (!instance) return values;

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
    const ctor = instance.constructor;
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
                        const vals = _extractInstanceValues(inst);
                        snapshot[uuid] = {
                            uuid: uuid,
                            name: name,
                            values: vals
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
                const vals = _extractInstanceValues(inst);
                const name = (inst as any).name || (inst.constructor ? inst.constructor.name : '');
                snapshot[uuid] = {
                    uuid: uuid,
                    name: name,
                    values: vals
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
            editor.Message.send('pts-asset', 'sync-preview-data', snapshot);
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
