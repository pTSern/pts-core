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

    set<_TKey extends _$TKey>(key: _TKey, value: pFlex.TFunc<[_$IGameData], _$IGameData[_TKey]>): Promise<_$IGameData[_$TKey]>
    set<_TKey extends _$TKey>(key: _TKey, value: _$IGameData[_TKey]): Promise<_$IGameData[_TKey]>
    sets<T extends readonly ({ [K in _$TKey]: { key: K; value: _$IGameData[K] } }[_$TKey])[]>(...data: T): Promise<{ [P in keyof T]: T[P] extends { key: infer K extends _$TKey } ? _$IGameData[K] : never }>

    all(): _$IGameData
    wait(): Promise<boolean>
    status(): _$TStatus
}

export const Data_Manager = js.createMap<_$IManager>(true);
export namespace Data_Manager {
    export type TData = _$IGameData
}

const _$ = {
    version: pTS.bridge.get('config'),
    container: pTS.bridge.get('game_data') ?? js.createMap(true),
    key: (_: string) => _$.version + _,
    storage: pTS.bridge.get('storage')
}

const _$ready = {
    init: !!_$.container,
    storage: !!_$.storage,
    resolve: null as ((value: boolean) => void) | null,
    promise: null as Promise<boolean> | null,
}

const _$pendings = new Map<string, any>();
let _$flushers: Promise<void> | null = null;

function _$settle(value: boolean) {
    if (!_$ready.promise) return;

    _$ready.resolve?.(value);
    _$ready.resolve = null;
    _$ready.promise = null;
}

async function _$flush() {
    if (!_$.storage?.set || _$pendings.size === 0) return;
    if (_$flushers) return _$flushers;

    _$flushers = (async () => {
        try {
            for (const [key, value] of Array.from(_$pendings.entries())) {
                await _$.storage.set(key as _$TKey, value);
                _$pendings.delete(key);
            }
        } finally {
            _$flushers = null;
        }
    })();

    return _$flushers;
}

async function _$mark() {
    if (!(_$ready.init && _$ready.storage)) return;
    if (Data_Manager['_$status'] === 'failed') return;

    Data_Manager['_$status'] = 'done';

    try {
        await _$flush();
        _$settle(true);
    } catch (error) {
        Data_Manager['_$status'] = 'failed';
        _$settle(false);
        throw error;
    }
}

if(!_$.storage) {
    pTS.bridge.on('set', (_key, _value) => {
        if(_key === 'storage' && _value) {
            _$.storage = _value as pTS.bridge.ISyncCache<Record<string, any>>
            _$ready.storage = true;
            DEV && console.log("[Data_Manager] >> SET STORAGE VIA Bridge >>", _$);
            void _$mark();
        }
    })
}

Data_Manager['_$status'] = 'pending';

Data_Manager.get = function(what) {
    const _out = _$.container[what];
    DEV && console.log("[Data_Manager].{get} Log: \n\tParams: ", what, "\n\tOut: ", _out, "\n\tOrigin: ", _$.container);
    return _out;
}

Data_Manager.gets = function(...keys) {
    const _obj = js.createMap();

    for(const key of keys) {
        _obj[key] = _$.container[key]
    }

    DEV && console.log("[Data_Manager].{gets} Log: \n\tParams: ", ...keys, "\n\tOut: ", _obj, "\n\tOrigin: ", _$.container);
    return _obj as ReturnType<_$IManager['gets']>
}

Data_Manager.set = async function<_TKey extends _$TKey>(k: _TKey, v: _$IGameData[_TKey] | pFlex.TFunc<[_$IGameData], _$IGameData[_TKey]>) {
    const _container = _$.container ?? (_$.container = js.createMap(true));
    const _val = typeof v === 'function' ? v(_container) : v;

    _container[k] = _val;

    if(_$.storage?.set) {
        try {
            await _$.storage.set(k, _val);
        } catch (error) {
            _$pendings.set(String(k), _val);
            Data_Manager['_$status'] = 'failed';
            throw error;
        }
    } else {
        _$pendings.set(String(k), _val);
        DEV && console.warn("[Data_Manager].{set} Storage is not ready yet. Value updated in memory and queued for sync.", k, _val);
    }

    return _val;
}

Data_Manager.init = async function(data) {
    const _container = _$.container ?? (_$.container = js.createMap(true));

    for(const _key in data) {
        if(_container[_key] === undefined) {
            _container[_key] = data[_key]
        }
    }

    _$ready.init = true;
    void _$mark();
    return true;
}

Data_Manager.all = function() {
    return _$.container;
}

Data_Manager.wait = function() {
    if(Data_Manager['_$status'] === 'done') return Promise.resolve(true)
    if(Data_Manager['_$status'] === 'failed') return Promise.resolve(false)
    if(!!Data_Manager['_$promise']) return Data_Manager['_$promise']

    Data_Manager['_$promise'] = new Promise<boolean>(resolve => {
        _$ready.resolve = resolve;
        void _$mark();
    });

    return Data_Manager['_$promise'];
}

Data_Manager.status = function() {
    return Data_Manager['_$status']
}

//@ts-ignore
Data_Manager.sets = function(...keys) {
    const _container = _$.container ?? (_$.container = js.createMap(true));
    const _prm = []

    for(const _ret of keys) {
        const { key, value } = _ret;
        if(key == null) continue;

        _container[key as string] = value;

        if(_$.storage?.set) {
            _prm.push(_$.storage.set(key, value).then(() => value));
        } else {
            _$pendings.set(String(key), value);
            _prm.push(Promise.resolve(value));
            DEV && console.warn("[Data_Manager].{sets} Storage is not ready yet. Value updated in memory and queued for sync.", key, value);
        }
    }

    return Promise.all(_prm)
}

//@ts-ignore
window.Data_Manager = Data_Manager
