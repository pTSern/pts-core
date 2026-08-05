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

    get<_TKey extends _$TKey>(key: _TKey): _$IGameData[_TKey]
    gets<_TKeys extends _$TKey[]>(...keys: _TKeys): { [K in _TKeys[number]]: _$IGameData[K] }

    set<_TKey extends _$TKey>(key: _TKey, value: pFlex.TFunc<[_$IGameData], _$IGameData[_TKey]>): Promise<_$IGameData[_TKey]>
    set<_TKey extends _$TKey>(key: _TKey, value: _$IGameData[_TKey]): Promise<_$IGameData[_TKey]>
    sets<T extends readonly ({ [K in _$TKey]: { key: K; value: _$IGameData[K] } }[_$TKey])[]>(...data: T): Promise<{ [P in keyof T]: T[P] extends { key: infer K extends _$TKey } ? _$IGameData[K] : never }>

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

const _$pstorage: Promise<any> = new Promise(resolve => {
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

let _$waitter: ((value: boolean) => void) | null = null;
const _$promise = new Promise<boolean>(resolve => {
    _$waitter = resolve;
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

Data_Manager.get = function(what) {
    const _out = _$.container[what];
    DEV && console.log("[Data_Manager].{get} Log: \n\tParams: ", what, "\n\tOut: ", _out, "\n\tOrigin: ", _$.container);
    return _out;
}

Data_Manager.gets = function(...keys) {
    const _obj = js.createMap();

    for (const key of keys) {
        _obj[key] = _$.container[key];
    }

    DEV && console.log("[Data_Manager].{gets} Log: \n\tParams: ", ...keys, "\n\tOut: ", _obj, "\n\tOrigin: ", _$.container);
    return _obj as ReturnType<_$IManager['gets']>;
}

Data_Manager.set = async function<_TKey extends _$TKey>(k: _TKey, v: _$IGameData[_TKey] | pFlex.TFunc<[_$IGameData], _$IGameData[_TKey]>) {
    const _container = _$.container;
    const _val = typeof v === 'function' ? v(_container) : v;

    _container[k] = _val;
    await _$persist(k, _val);

    return _val;
}

Data_Manager.init = async function(data) {
    const _container = _$.container;

    // 1. Wait for storage ready (with a 3s timeout fallback in case storage is omitted)
    const timeout = new Promise<null>(res => setTimeout(() => res(null), 3000));
    const storage = await Promise.race([_$pstorage, timeout]);

    // 2. Load stored data or seed default values concurrently
    if (storage?.get) {
        const keys = Object.keys(data);

        // Bulk parallel read
        const _readers = keys.map(k => storage.get(k).catch(() => undefined));
        const _keepers = await Promise.all(_readers);

        const _writers: Promise<any>[] = [];

        console.group("[Data_Manager] Init with storage:", storage);
        console.log("Keepers:", _keepers);
        for (let i = 0; i < keys.length; i++) {
            const _key = keys[i]
            const _val = _keepers[i];

            console.log("Get from storage:", _key, "=>", _val, " | ", data[_key]);
            if (_val !== undefined && _val !== null) {

                _container[_key] = _val;
            } else {
                _container[_key] = data[_key];
                if (storage.set) {
                    _writers.push(storage.set(_key, data[_key]).catch((e: any) => {
                        DEV && console.error('[Data_Manager] Failed to set default for key:', _key, e);
                    }));
                }
            }
        }

        console.groupEnd();

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
    if (_$waitter) {
        _$waitter(true);
        _$waitter = null;
    }

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
    return _$promise;
}

Data_Manager.status = function() {
    return _$.status;
}

//@ts-ignore
Data_Manager.sets = function(...keys) {
    const _container = _$.container;
    const _prm: Promise<any>[] = [];
    const items = (keys.length === 1 && Array.isArray(keys[0])) ? keys[0] : keys;

    for (const _ret of items) {
        const { key, value } = _ret;
        if (key == null) continue;

        _container[key as string] = value;
        _prm.push(_$persist(key as _$TKey, value).then(() => value));
    }

    return Promise.all(_prm);
}

//@ts-ignore
globalThis.Data_Manager = Data_Manager;
