/**
 * NOTE DO NOT CHANGE THIS FILE IF U DONT KNOW WHAT U ARE DOING
 */

import { js } from "cc";
import { DEV } from "cc/env";
import { pGlobal } from "../utils";

type _$IGameData = pTS.bridge.IGameData;
type _$TKey = keyof _$IGameData;
type _$TStatus = 'pending' | 'done' | 'failed';

type _$IManager = {
    init(data: _$IGameData): Promise<boolean>

    // Single key get
    get<_TKey extends _$TKey>(key: _TKey): _$IGameData[_TKey]
    // Bulk keys get
    get<_TKeys extends _$TKey[]>(...keys: _TKeys): { [K in _TKeys[number]]: _$IGameData[K] }
    get<_TKeys extends _$TKey[]>(keys: _TKeys): { [K in _TKeys[number]]: _$IGameData[K] }

    // Single key set
    set<_TKey extends _$TKey>(key: _TKey, value: pFlex.TFunc<[_$IGameData], _$IGameData[_TKey]>): Promise<_$IGameData[_TKey]>
    set<_TKey extends _$TKey>(key: _TKey, value: _$IGameData[_TKey]): Promise<_$IGameData[_TKey]>

    // Variadic key-value set overloads
    set<K1 extends _$TKey, K2 extends _$TKey>(k1: K1, v1: _$IGameData[K1], k2: K2, v2: _$IGameData[K2]): Promise<void>
    set<K1 extends _$TKey, K2 extends _$TKey, K3 extends _$TKey>(k1: K1, v1: _$IGameData[K1], k2: K2, v2: _$IGameData[K2], k3: K3, v3: _$IGameData[K3]): Promise<void>
    set<K1 extends _$TKey, K2 extends _$TKey, K3 extends _$TKey, K4 extends _$TKey>(k1: K1, v1: _$IGameData[K1], k2: K2, v2: _$IGameData[K2], k3: K3, v3: _$IGameData[K3], k4: K4, v4: _$IGameData[K4]): Promise<void>
    set<K1 extends _$TKey, K2 extends _$TKey, K3 extends _$TKey, K4 extends _$TKey, K5 extends _$TKey>(k1: K1, v1: _$IGameData[K1], k2: K2, v2: _$IGameData[K2], k3: K3, v3: _$IGameData[K3], k4: K4, v4: _$IGameData[K4], k5: K5, v5: _$IGameData[K5]): Promise<void>

    all(_async?: false): _$IGameData
    all(_async: true): Promise<_$IGameData>
    all(_async?: boolean): _$IGameData | Promise<_$IGameData>

    wait(): Promise<boolean>
    status(): _$TStatus

    // Eventify methods
    on<_TKey extends 'set' | 'get'>(event: _TKey, ...funcs: any[]): void
    once<_TKey extends 'set' | 'get'>(event: _TKey, ...funcs: any[]): void
    off<_TKey extends 'set' | 'get'>(event: _TKey, ...funcs: any[]): void
    clear(event: 'set' | 'get'): void
}

const _$ = {
    storage: pTS.bridge.get('storage'),
    status: 'pending' as _$TStatus,
    map: null as Map<string, any> | null,
};

const _$storage: Promise<any> = new Promise(resolve => {
    if (_$.storage?.set) {
        resolve(_$.storage);
    } else {
        pTS.bridge.once('set', (_key, _value: pTS.bridge.ISyncCache<Record<string, any>>) => {
            if (_key === 'storage' && _value?.set) {
                _$.storage = _value;
                DEV && console.log("[Data_Manager] >> Storage ready via Bridge >>", _$.storage);
                resolve(_value);
            }
        });
    }
});

let _$waiter: pFlex.TFunc<[boolean], void> | null = null;
const _$promiser = new Promise<boolean>(resolve => _$waiter = resolve);

const _$cache = js.createMap() as any;
function _$mobj() {
    if (_$.map) for (const [k, v] of _$.map) _$cache[k] = v;
    return _$cache;
}

async function _$persist(key: _$TKey, value: any) {
    const _s = _$.storage;
    if (!_s?.set) { pGlobal.warn('DEV', '[Data_Manager] Storage not ready, in-memory only:', key); return; }
    try { await _s.set(key, value); }
    catch (e) { pGlobal.error('DEV', '[Data_Manager] Persist failed:', key, e); throw e; }
}

export const Data_Manager = pTS.bridge.replican<_$IGameData>({
    is_dict_mode: true,
    is_eventify: true,
    is_ambiguous: true,
    asynctify: {
        async set(key: string, value: any, map: Map<string, any>) {
            _$.map = map;
            const _k = key as _$TKey;
            const _had = map.has(_k), _old = map.get(_k);
            const _val = typeof value === 'function' ? value(_$mobj()) : value;

            map.set(_k, _val);
            try { await _$persist(_k, _val); return _val; }
            catch (e) { _had ? map.set(_k, _old) : map.delete(_k); throw e; }
        },
        async get(key: string, map: Map<string, any>) {
            _$.map = map;
            if (map.has(key)) return map.get(key);

            if (_$.storage?.get) {
                try {
                    const _v = await _$.storage.get(key);
                    if (_v != null) { map.set(key, _v); return _v; }
                } catch (e) { pGlobal.error('DEV', '[Data_Manager] Storage get failed:', key, e); }
            }
            return undefined;
        }
    }
}) as unknown as _$IManager;

export namespace Data_Manager {
    export type TData = _$IGameData;
    export type TKey = _$TKey;
}

// Capture replican's original get to bootstrap the internal Map reference
const _$og = Data_Manager.get;
async function _$map() {
    if (_$.map) return _$.map;
    await _$og.call(Data_Manager, '__init__' as any);
    return _$.map!;
}

Data_Manager.get = function(what: any, ...rest: any[]) {
    if (_$.status !== 'done') return Data_Manager.wait().then(() => Data_Manager.get(what, ...rest));

    const m = _$.map!;
    if (Array.isArray(what) || rest.length > 0) {
        const keys = Array.isArray(what) ? what : [what, ...rest];
        const _obj = js.createMap();
        for (const k of keys) _obj[k] = m.get(k);
        return _obj;
    }
    return m.get(what);
} as any;

Data_Manager.init = async function(data: _$IGameData) {
    if (_$.status === 'done') return true;

    const map = await _$map();

    // Wait for storage ready (3s timeout fallback)
    const storage = await Promise.race([
        _$storage,
        new Promise<null>(r => setTimeout(() => r(null), 3000))
    ]);

    if (storage?.get) {
        const keys = Object.keys(data);
        const vals = await Promise.all(keys.map(k => storage.get(k).catch(() => undefined)));
        const writers: Promise<any>[] = [];

        for (let i = 0; i < keys.length; i++) {
            const k = keys[i], v = vals[i];
            if (v != null) {
                map.set(k, v);
            } else {
                map.set(k, data[k as _$TKey]);
                if (storage.set) writers.push(
                    storage.set(k, data[k as _$TKey]).catch((e: any) => {
                        pGlobal.error('DEV', '[Data_Manager] Failed to seed key:', k, e);
                    })
                );
            }
        }
        if (writers.length) await Promise.all(writers);
    } else {
        for (const k in data) if (!map.has(k)) map.set(k, data[k as _$TKey]);
    }

    _$.status = 'done';
    _$waiter?.(true); _$waiter = null;
    Data_Manager.init = async () => true;
    console.log('[Data_Manager] Initialized with data:', _$mobj());
    return true;
};

Data_Manager.all = function(_async: boolean = false) {
    if (_async) return Data_Manager.wait().then(() => _$mobj());
    return _$mobj();
} as typeof Data_Manager.all;

Data_Manager.wait = function() {
    if (_$.status === 'done') return Promise.resolve(true);
    if (_$.status === 'failed') return Promise.resolve(false);
    return _$promiser;
};

Data_Manager.status = function() { return _$.status; };

globalThis.Data_Manager = Data_Manager;
