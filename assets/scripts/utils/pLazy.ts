import { Enum } from "cc";
import * as pArray from "./pArray";

function _enums(obj: pFlex.TArray<object>, ...objs: object[]): void {
    objs = pArray.flat(obj, objs);
    for(const _obj of objs) {
        Enum(_obj);
    }
}

export const enums = Object.assign(_enums, {
    create(obj: Record<string, string | number | boolean>) {
        if(typeof obj !== 'object') {
            const _str = String(obj);
            return {
                [_str]: _str,
                __enums__: null
            }
        }

        const _des = Object.getOwnPropertyDescriptors(obj);
        const _out = { __enums__: null } as Record<string, string | number | boolean>;

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
