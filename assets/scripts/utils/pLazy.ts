import { Enum, js } from "cc";
import * as pArray from "./pArray";
import * as pConst from "./pConst";

interface _ITimer {
    getDayDif(a: number, b: number): number
}
export const timer = js.createMap(true) as _ITimer;
timer.getDayDif = function(a, b) {
    return Math.floor(a/pConst.TIMER.DAY()) - Math.floor(b/pConst.TIMER.DAY());
}


function _enums(obj: pFlex.TArray<object>, ...objs: object[]): void {
    objs = pArray.flat(obj, objs);
    for(const _obj of objs) {
        Enum(_obj);
    }
}

type _IObj = Record<pFlex.TKey, pFlex.TKey> & { __enums__?: null };
const _$pool = new WeakMap<object, pFlex.TKey[]>();
export const enums = Object.assign(_enums, {
    at<_TObject extends _IObj>(obj: _TObject, index: number): _TObject[keyof _TObject] {
        const _out = obj[index];
        if(_out) return _out as _TObject[keyof _TObject];

        let _values = _$pool.get(obj);
        if(!_values) {
            _values = Object.values(obj);
            _$pool.set(obj, _values);
        }
        return _values[index] as _TObject[keyof _TObject];
    },
    size(obj: _IObj) {
        const _keys = Object.keys(obj);
        if(Enum.isEnum(obj)) {
            return _keys.length;
        }
        return _keys.length / 2;
    },
    create(obj: _IObj | Array<any>) {
        if(Array.isArray(obj)) {
            return obj.reduce((acc, cur) => {
                acc[String(cur)] = cur;
                return acc;
            }, { __enums__: null } as _IObj);
        }

        if(typeof obj !== 'object') {
            const _str = String(obj);
            return {
                [_str]: _str,
                __enums__: null
            }
        }

        const _des = Object.getOwnPropertyDescriptors(obj);
        const _out = { __enums__: null } as _IObj;

        for(const _key in _des) {
            const _desc = _des[_key];

            if(typeof _desc.get === 'function' || typeof _desc.set === 'function') {
                continue;
            }

            _out[_key] = _desc.value;
        }

        return _out;
    },
    lazy: _enums
})
