/**
 * NOTE DO NOT CHANGE THIS FILE IF U DONT KNOW WHAT U ARE DOING
 */

import { js } from "cc";

type IGameData = pTS.bridge.IGameData;
type _$TKey = keyof IGameData;

interface _$IManager {
    init(): Promise<boolean>

    get<_TKey extends _$TKey>(key: _TKey): IGameData[_TKey]
    gets<_TKeys extends _$TKey[]>(...keys: _TKeys): { [K in _TKeys[number]]: IGameData[K] }

    set<_TKey extends _$TKey>(key: _TKey, value: pFlex.TFunc<[IGameData], IGameData[_TKey]>): Promise<IGameData[_$TKey]>
    set<_TKey extends _$TKey>(key: _TKey, value: IGameData[_TKey]): Promise<IGameData[_$TKey]>
    sets<T extends readonly ({ [K in _$TKey]: { key: K; value: IGameData[K] } }[_$TKey])[]>(...data: T): Promise<{ [P in keyof T]: T[P] extends { key: infer K extends _$TKey } ? IGameData[K] : never }>
}

export const Data_Manager = js.createMap<_$IManager>(true);

const _$ = {
    version: pTS.bridge.get('config'),
    container: pTS.bridge.get('game_data', () => js.createMap(true) ),
    key: (_: string) => _$.version + _,

    storage: pTS.bridge.get('storage')
}

function _init() {
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
    return _$.container[what];
}

Data_Manager.gets = function(...keys) {
    const _obj = js.createMap();

    for(const key of keys) {
        _obj[key] = _$.container[key]
    }

    return _obj as ReturnType<_$IManager['gets']>
}

Data_Manager.set = async function<_TKey extends _$TKey>(k: _TKey, v: IGameData[_TKey] | pFlex.TFunc<[IGameData], IGameData[_TKey]>) {
    if(typeof v == 'function') {
        const _val = v(_$.container);
        await _$.storage.set(k, _val).then(_ => _$.container[k] = _val)
        return _val;
    }

    await _$.storage.set(k, v).then(_ => _$.container[k] = v)
    return v;
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
