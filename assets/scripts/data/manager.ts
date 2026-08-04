/**
 * NOTE DO NOT CHANGE THIS FILE IF U DONT KNOW WHAT U ARE DOING
 */

import { js } from "cc";
import { DEV } from "cc/env";

type _$IGameData = pTS.bridge.IGameData;
type _$TKey = keyof _$IGameData;

interface _$IManager {
    init(data: _$IGameData): Promise<boolean>

    get<_TKey extends _$TKey>(key: _TKey): _$IGameData[_TKey]
    gets<_TKeys extends _$TKey[]>(...keys: _TKeys): { [K in _TKeys[number]]: _$IGameData[K] }

    set<_TKey extends _$TKey>(key: _TKey, value: pFlex.TFunc<[_$IGameData], _$IGameData[_TKey]>): Promise<_$IGameData[_$TKey]>
    set<_TKey extends _$TKey>(key: _TKey, value: _$IGameData[_TKey]): Promise<_$IGameData[_$TKey]>
    sets<T extends readonly ({ [K in _$TKey]: { key: K; value: _$IGameData[K] } }[_$TKey])[]>(...data: T): Promise<{ [P in keyof T]: T[P] extends { key: infer K extends _$TKey } ? _$IGameData[K] : never }>

    all(): _$IGameData
}

export const Data_Manager = js.createMap<_$IManager>(true);
export namespace Data_Manager {
    export type TData = _$IGameData
}

const _$ = {
    version: pTS.bridge.get('config'),
    container: pTS.bridge.get('game_data'),
    key: (_: string) => _$.version + _,

    storage: pTS.bridge.get('storage')
}

if(!_$.storage) {
    pTS.bridge.on('set', (_key, _value) => {
        if(_key === 'storage' && _value) {
            _$.storage = _value as pTS.bridge.ISyncCache<Record<string, any>>
            console.log("[Data_Manager] >> SET STORAGE VIA Bridge >>", _$);
        }
    })
}

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
    if(typeof v == 'function') {
        const _val = v(_$.container);
        await _$.storage.set(k, _val).then(_ => _$.container[k] = _val)
        return _val;
    }

    await _$.storage.set(k, v).then(_ => _$.container[k] = v)
    return v;
}

Data_Manager.init = async function(data) {
    for(const _key in data) {
        if(_$.container[_key] === undefined) {
            _$.container[_key] = data[_key]
        }
    }
    return true;
}

Data_Manager.all = function() {
    return _$.container
}

//@ts-ignore
Data_Manager.sets = function(...keys) {
    const _arr = []
    const _prm = []

    for(const _ret of keys) {
        const { key, value } = _ret;

        _arr.push(value)
        if(!key) continue;
        _prm.push(_$.storage.set(key, value)
            .then( _ => {
                //@ts-ignore
                _$.container[key] = value;
                return value 
            })
        );
    }

    return Promise.all(_prm)
}

//@ts-ignore
window.Data_Manager = Data_Manager
