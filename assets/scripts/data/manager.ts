/**
 * NOTE DO NOT CHANGE THIS FILE IF U DONT KNOW WHAT U ARE DOING
 */

import { js } from "cc";
import { DEV } from "cc/env";

type _$IGameData = pTS.bridge.IGameData;
type _$TKey = keyof _$IGameData;
type _$TStatus = 'pending' | 'done' | 'failed'

interface _$IManager {
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
}

export const Data_Manager = js.createMap<_$IManager>(true);
export namespace Data_Manager {
    export type TData = _$IGameData
}

const _$ = {
    container: pTS.bridge.get('game_data', () => js.createMap<_$IGameData>(true)),
    storage: pTS.bridge.get('storage'),
    status: 'pending' as _$TStatus,
}

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

let _$waiter: ((value: boolean) => void) | null = null;
const _$waitPromise = new Promise<boolean>(resolve => {
    _$waiter = resolve;
});

async function _$persist<_TKey extends _$TKey>(key: _TKey, value: _$IGameData[_TKey]) {
    const _storage = _$.storage;
    if (!_storage?.set) {
        DEV && console.warn('[Data_Manager] Storage is not ready. Value set in memory only.', key, value);
        return;
    }

    try {
        await _storage.set(key, value);
    } catch (error) {
        DEV && console.error('[Data_Manager] Failed to persist data key:', key, error);
    }
}

function _$gone(key: string) {
    const _out = _$.container[key as _$TKey];
    DEV && console.log("[Data_Manager].{get} Log: \n\tParams: ", key, "\n\tOut: ", _out, "\n\tOrigin: ", _$.container);
    return _out;
}

function _$gbulk(keysList: string[]) {
    const _obj = js.createMap();
    for (const key of keysList) {
        _obj[key] = _$.container[key as _$TKey];
    }
    DEV && console.log("[Data_Manager].{get bulk} Log: \n\tParams: ", ...keysList, "\n\tOut: ", _obj, "\n\tOrigin: ", _$.container);
    return _obj;
}

Data_Manager.get = function(what: any, ...rest: any[]) {
    if (_$.status !== 'done') {
        return Data_Manager.wait().then(() => {
            return Data_Manager.get(what, ...rest);
        });
    }

    if (Array.isArray(what) || rest.length > 0) {
        const keysList = Array.isArray(what) ? what : [what, ...rest];
        return _$gbulk(keysList);
    }

    return _$gone(what);
} as any;

Data_Manager.set = async function(...args: any[]) {
    if (_$.status !== 'done') {
        await Data_Manager.wait();
    }

    const _container = _$.container as any;

    if (args.length === 2) {
        const k = args[0] as _$TKey;
        const v = args[1];
        const _val = typeof v === 'function' ? v(_container) : v;

        _container[k] = _val;
        await _$persist(k, _val);
        return _val;
    }

    if (args.length % 2 !== 0) {
        DEV && console.error("[Data_Manager] set expected key-value pairs (even argument count), got:", args.length);
    }

    const _prm: Promise<any>[] = [];
    for (let i = 0; i < args.length - 1; i += 2) {
        const k = args[i] as _$TKey;
        const v = args[i + 1];
        if (k == null) continue;

        const _val = typeof v === 'function' ? v(_container) : v;
        _container[k] = _val;
        _prm.push(_$persist(k, _val));
    }

    await Promise.all(_prm);
} as any;

Data_Manager.init = async function(data) {
    if (_$.status === 'done') {
        return true;
    }

    const _container = _$.container;

    // 1. Wait for storage ready (with a 3s timeout fallback in case storage is omitted)
    const timeout = new Promise<null>(res => setTimeout(() => res(null), 3000));
    const storage = await Promise.race([_$storage, timeout]);

    // 2. Load stored data or seed default values concurrently
    if (storage?.get) {
        const keys = Object.keys(data);

        // Bulk parallel read
        const _readers = keys.map(k => storage.get(k).catch(() => undefined));
        const _keepers = await Promise.all(_readers);

        const _writers: Promise<any>[] = [];

        for (let i = 0; i < keys.length; i++) {
            const _key = keys[i];
            const storedVal = _keepers[i];

            if (storedVal !== undefined && storedVal !== null) {
                _container[_key] = storedVal;
            } else {
                _container[_key] = data[_key];
                if (storage.set) {
                    _writers.push(storage.set(_key, data[_key]).catch((e: any) => {
                        DEV && console.error('[Data_Manager] Failed to set default for key:', _key, e);
                    }));
                }
            }
        }

        // Bulk parallel write for missing default keys
        if (_writers.length > 0) {
            await Promise.all(_writers);
        }
    } else {
        for (const _key in data) {
            if (_container[_key] === undefined) {
                _container[_key] = data[_key];
            }
        }
    }

    _$.status = 'done';
    if (_$waiter) {
        _$waiter(true);
        _$waiter = null;
    }

    // Init runs once: override init with one-shot instant resolver
    Data_Manager.init = async () => true;

    return true;
}

Data_Manager.all = function(_async: boolean = false) {
    if (_async) {
        return Data_Manager.wait().then(_ => _$.container);
    } else {
        return _$.container;
    }
} as typeof Data_Manager.all;

Data_Manager.wait = function() {
    if (_$.status === 'done') return Promise.resolve(true);
    if (_$.status === 'failed') return Promise.resolve(false);
    return _$waitPromise;
}

Data_Manager.status = function() {
    return _$.status;
}

//@ts-ignore
globalThis.Data_Manager = Data_Manager;
