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

export interface IEnumHookEntry {
    target: object;
    name?: string;
    tsType?: string;
}

export type TEnumHookCallback = (entry: IEnumHookEntry) => void;

const _$root: any =
    typeof globalThis !== "undefined"
        ? globalThis
        : typeof window !== "undefined"
            ? window
            : typeof self !== "undefined"
                ? self
                : {};

function _get_enum_registry(): Map<object, IEnumHookEntry> {
    _$root.pTS = _$root.pTS || {};
    if (!_$root.pTS.__enums__ || typeof _$root.pTS.__enums__.set !== "function") {
        _$root.pTS.__enums__ = new Map<object, IEnumHookEntry>();
    }
    return _$root.pTS.__enums__ as Map<object, IEnumHookEntry>;
}

function _get_enum_hooks(): Set<TEnumHookCallback> {
    _$root.pTS = _$root.pTS || {};
    if (!_$root.pTS.__enum_hooks__ || typeof _$root.pTS.__enum_hooks__.add !== "function") {
        _$root.pTS.__enum_hooks__ = new Set<TEnumHookCallback>();
    }
    return _$root.pTS.__enum_hooks__ as Set<TEnumHookCallback>;
}

function _hook_enum(target: object, name?: string, tsType?: string): void {
    if (!target || typeof target !== "object") return;
    const registry = _get_enum_registry();
    const prev = registry.get(target);
    const entry: IEnumHookEntry = {
        target,
        name: name || prev?.name,
        tsType: tsType || prev?.tsType,
    };
    registry.set(target, entry);

    const hooks = _get_enum_hooks();
    hooks.forEach((cb) => {
        try {
            cb(entry);
        } catch {}
    });
}

function _enums(obj: pFlex.TArray<object>, ...objs: object[]): void {
    objs = pArray.flat(obj, objs);
    for (const _obj of objs) {
        if (!_obj || typeof _obj !== "object") continue;
        Enum(_obj);
        _hook_enum(_obj);
    }
}

type _IObj = Record<pFlex.TKey, pFlex.TKey> & { __enums__?: null };
const _$pool = new WeakMap<object, pFlex.TKey[]>();
export const enums = Object.assign(_enums, {
    /**
     * Register an enum with Cocos `Enum(obj)` AND record it in the global `pTS.__enums__` hook registry
     * so editor extensions like `pts-ecs` can discover it directly from memory.
     */
    register<_TObject extends object>(obj: _TObject, name?: string, tsType?: string): _TObject {
        Enum(obj);
        _hook_enum(obj, name, tsType);
        return obj;
    },
    /**
     * Subscribe to enum registrations (optionally replaying already-registered enums immediately).
     * Returns an unsubscribe function.
     */
    hook(cb: TEnumHookCallback, replay: boolean = false): () => void {
        const hooks = _get_enum_hooks();
        hooks.add(cb);
        if (replay) {
            _get_enum_registry().forEach((entry) => {
                try {
                    cb(entry);
                } catch {}
            });
        }
        return () => {
            hooks.delete(cb);
        };
    },
    /** Return all enum entries captured by the `pLazy.enums` hooker. */
    registered(): IEnumHookEntry[] {
        return Array.from(_get_enum_registry().values());
    },
    /** Direct access to the shared global `Map<object, IEnumHookEntry>` registry. */
    get registry(): Map<object, IEnumHookEntry> {
        return _get_enum_registry();
    },
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
    create(obj: _IObj | Array<any>, name?: string) {
        if(Array.isArray(obj)) {
            const _out = obj.reduce((acc, cur) => {
                acc[String(cur)] = cur;
                return acc;
            }, { __enums__: null } as _IObj);
            _hook_enum(_out, name);
            return _out;
        }

        if(typeof obj !== 'object') {
            const _str = String(obj);
            const _out = {
                [_str]: _str,
                __enums__: null
            };
            _hook_enum(_out, name);
            return _out;
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

        _hook_enum(_out, name);
        return _out;
    },
    lazy: _enums
})
