
import { js, Component, director, _decorator } from "cc";
import { DEV, EDITOR, EDITOR_NOT_IN_PREVIEW } from "cc/env";
import * as pArray from "./pArray";
import * as pConst from "./pConst";
import * as cc from 'cc';
import { CC_IEnumable, CC_IEnumList } from "../interfaces/cc/CC.IEnumable";

/**
 * pClass: All class-based patterns, binders, and decorators.
 */

const _singletonPool: Record<pFlex.TKey, pFlex.TFunc> = js.createMap();
const _persistentPool: WeakMap<pFlex.TCtor, Record<pFlex.TKey, any>> = new WeakMap();
const _singletonKeys = pConst.KEYS.SINGLETON;
const _waiters = new Map<Function, { promise: Promise<any>, resolve: pFlex.TFunc, resolved: boolean }>();

// --- Helpers ---

function _resolver(constructor: pFlex.TCtor) {
    let data = _waiters.get(constructor);
    if (!data) {
        data = { promise: Promise.resolve(), resolve: null, resolved: true };
        _waiters.set(constructor, data);
    }
    data.resolve?.(instance(constructor));
    data.resolved = true;
}

// --- Foundation ---

const _$ccclasses = [ 'AllComponents', 'NoneComponent', "cc.Component", "Exclude.cc.Component", "cc.Asset", "All" ] as const;
const _$types = ['cc.Node', 'Primitive', ..._$ccclasses] as const
const _$primitives = ["CCString", 'CCInteger', "CCBoolean", 'CCFloat'] as const;
export const ETypes = CC_IEnumable.generator(_$types);
export type ETypes = (typeof _$types[number])
export const EPrimitive = CC_IEnumable.generator(_$primitives);
export type EPrimitive = (typeof _$primitives[number])
export const CCEPrimitive = CC_IEnumList.generator(_$primitives);

export function getClassName(filter: ETypes, type: string) {
    if(filter == 'cc.Node') return filter
    return type;
}

export function getPrimitiveType(_type: EPrimitive) {
    const type = cc[_type];
    if(!type) return null
    return { type, default: type.default }
}

const _$pool = js.createMap<Record<ETypes, Set<string>>>(true);

export function getAllCCClasses(type: ETypes = 'All'): Set<string> {
    const _all = js._nameToClass;

    if(_$pool[type]) return _$pool[type];

    for(const _key of _$ccclasses) {
        _$pool[_key] = new Set();
    }

    for(const _k in _all) {
        //if (!Object.prototype.hasOwnProperty.call(_all, _k)) continue;
        const _v = _all[_k];

        if(_v === cc.Component || _v.prototype instanceof cc.Component) {
            _$pool['AllComponents'].add(_k);

            const _sub = _k.includes('cc.') ? "cc.Component" : "Exclude.cc.Component";
            _$pool[_sub].add(_k);

        } else if(_v === cc.Asset || _v.prototype instanceof cc.Asset) {
            _$pool['cc.Asset'].add(_k);
        } else {
            _$pool['NoneComponent'].add(_k);
        }

        _$pool['All'].add(_k);
    }

    return _$pool[type];
}

if(DEV) {
    window['pTS_utils_pClas_$pool'] = _$pool;
}

export function convert(listener: pFlex.THandler<any[], any>): pFlex.IBinder {
    if (typeof listener === 'function') {
        return { func: listener, priority: 0, binder: null };
    }
    return {
        func: listener.func,
        binder: listener.binder,
        priority: listener.priority ?? 0,
        args: listener.args
    };
}

export function mapper(listener: pFlex.TArray<pFlex.THandler>, out?: pFlex.IBinder[]): pFlex.IBinder[] {
    out = out || []
    if (!listener) return out;

    if(Array.isArray(listener)) {
        for(const _lis of listener) {
            _lis && out.push(convert(_lis));
        }
    } else {
        out.push(convert(listener));
    }
    return out;
}

function _emit<_TArg extends any[] = any[], _TReturn = any>(_func: pFlex.IBinder<_TArg[]>, params: _TArg) {
            const { func, args, binder } = _func;
            const _params = args ? args : params
            return binder ? func.call(binder, ..._params) : func(..._params)
}

export function emit<_TArg extends any[] = any[], _TReturn = any>(funcs: pFlex.TArray<pFlex.IBinder<_TArg>>, ...params: _TArg): any[] {
    if (!funcs) return [];

    const out = []
    if(Array.isArray(funcs)) {
        for(const _func of funcs) {
            out.push(_emit(_func, params))
        }
    } else {
        out.push(_emit(funcs, params))
    }

    return out;
}

// --- Decorators & Patterns ---

export function wait<T>(constructor: pFlex.TCtor<any, T>): Promise<T> {
    let data = _waiters.get(constructor);
    if (!data) {
        let resolve: any;
        const promise = new Promise<T>(rs => resolve = rs);
        data = { promise, resolve, resolved: false };
        _waiters.set(constructor, data);
    }
    return data.resolved ? Promise.resolve(instance(constructor)) : data.promise;
}

function _logger(who: any, name: string) {
    who['_$L'] = js.createMap();

    who['_$L'].log = console.log.bind(console, `[${name}] Log: `);
    who['_$L'].warn = console.log.bind(console, `[${name}] Warn: `);
    who['_$L'].error = console.log.bind(console, `[${name}] Error: `);

    return who;
}

type _TMode = 'EDITOR_NOT_IN_PREVIEW' | "EDITOR" | "EDITOR_ONLY_IN_PREVIEW" | "RUNTIME"
export function editor_ccclass(name: string, mode: _TMode = "EDITOR_ONLY_IN_PREVIEW", logger: boolean = true) {
    const should = _$hould(mode)
    return (target: any) => {
        logger && _logger(target, name);
        return should ? _decorator.ccclass(name)(target) : void 0
    };
}

export function logcat(who: any, method: 'log' | 'warn' | 'error') {
    const _target = who['_$L'] || console;

    return _target[method] as pFlex.TFunc<any, void>
}

function _$hould(mode: _TMode) {
    let should = false;

    if (mode === 'EDITOR_NOT_IN_PREVIEW') should = (EDITOR && EDITOR_NOT_IN_PREVIEW);
    else if (mode === 'EDITOR') should = EDITOR;
    else if (mode === 'EDITOR_ONLY_IN_PREVIEW') should = pConst.EDITOR_ONLY_IN_PREVIEW;
    else if (mode === 'RUNTIME') should = (!EDITOR) || (pConst.EDITOR_ONLY_IN_PREVIEW)

    return should
}

export function editor_property(type?: any, opt?: { name?: string, multiline?: boolean, override?: boolean, kill?: boolean, writable?: boolean }, mode: _TMode = 'EDITOR_ONLY_IN_PREVIEW') {
    const should = _$hould(mode);

    return (target: any, key: string, descriptor?: PropertyDescriptor) => {
        if (!EDITOR) { if (opt?.kill && descriptor?.get) descriptor.get = () => null; return; }
        if (!should) return;
        const options: any = { group: { name: "_Debugger", id: "0" }, readonly: !opt?.writable, visible: true };
        if (type) options.type = type;
        if (opt?.name) options.displayName = opt.name;
        if (opt?.multiline) options.multiline = true;
        if (opt?.override) options.override = true;
        return descriptor ? _decorator.property(options)(target, key, descriptor) : _decorator.property(options)(target, key);
    };
}

export function logger(name?: string) {
    return (constructor: pFlex.TCtor) => {
        const className = name || js.getClassName(constructor);
        for (const level of pConst.LOG_LEVELS) {
            constructor.prototype[level] = console[level].bind(console, `[${className}] ${level.toUpperCase()} >>>`);
        }
    };
}

export function scriptable(name: string) {
    return (constructor: Function) => {
        if (EDITOR) return;
        (globalThis as any).pTScript ||= {};
        (globalThis as any).pTScript[name] = constructor;
    };
}

export function instance<T>(_ctor: pFlex.TCtor<any, T> | string, ...args: any[]): T {
    if (typeof _ctor === 'string') return _singletonPool[_ctor]?.(...args) ?? null;
    const getter = _ctor[_singletonKeys.GETTER];
    if (getter) return getter(...args);
    return _ctor[_singletonKeys.INSTANCE];
}

export function singleton(opt?: { initer?: string, destroyer?: string, wake?: 'Instantly' | 'None', pooler?: boolean, async?: boolean, name?: string }) {
    return (constructor: pFlex.TCtor) => {
        const isComp = constructor.prototype instanceof Component;
        const config = { initer: isComp ? 'onLoad' : '_init', destroyer: isComp ? 'onDestroy' : '_clean', wake: 'Instantly', pooler: false, async: false, ...opt };
        constructor[_singletonKeys.OPTION] = config;

        if (isComp) {
            const originIniter = constructor.prototype[config.initer];
            constructor.prototype[config.initer] = function(...args: any[]) {
                originIniter?.apply(this, args);
                constructor[_singletonKeys.INSTANCE] = this;
                _resolver(constructor);
            };
            constructor[_singletonKeys.GETTER] = () => {
                if (!constructor[_singletonKeys.INSTANCE]) {
                    constructor[_singletonKeys.INSTANCE] = director.getScene()?.getComponentInChildren(constructor);
                    if (constructor[_singletonKeys.INSTANCE]) _resolver(constructor);
                }
                return constructor[_singletonKeys.INSTANCE];
            };
        } else {
            constructor[_singletonKeys.GETTER] = (...args: any[]) => {
                if (!constructor[_singletonKeys.INSTANCE]) {
                    constructor[_singletonKeys.INSTANCE] = new constructor(...args);
                    constructor[_singletonKeys.INSTANCE][config.initer]?.(...args);
                    _resolver(constructor);
                }
                return constructor[_singletonKeys.INSTANCE];
            };
            if (config.wake === 'Instantly') instance(constructor);
        }

        const originDestroyer = constructor.prototype[config.destroyer];
        constructor.prototype[config.destroyer] = function(...args: any[]) {
            originDestroyer?.apply(this, args);
            constructor[_singletonKeys.INSTANCE] = null;
        };

        if (config.pooler) _singletonPool[config.name || js.getClassName(constructor)] = constructor[_singletonKeys.GETTER];
    };
}

export function imps(...names: string[]) {
    return (constructor: pFlex.TCtor) => {
        constructor[_singletonKeys.IMPL] ||= {};
        names.forEach(n => constructor[_singletonKeys.IMPL][n] = true);
    };
}

export function persistent(opt: { key: string, initer?: string, destroyer?: string }) {
    return (constructor: pFlex.TCtor) => {
        let pool = _persistentPool.get(constructor);
        if (!pool) { pool = js.createMap(); _persistentPool.set(constructor, pool); }
        const originIniter = constructor.prototype[opt.initer || 'onLoad'];
        constructor.prototype[opt.initer || 'onLoad'] = function(...args: any[]) {
            originIniter?.apply(this, args);
            const keyValue = typeof this[opt.key] === 'function' ? this[opt.key]() : this[opt.key];
            if (pool[keyValue]) { if (opt.destroyer) this[opt.destroyer]?.(); } else { pool[keyValue] = this; }
        };
    };
}

// --- Utilities ---

export function override<_TClass, _TGetSetter>(constructor: pFlex.TCtor<any, _TClass>, key: keyof _TClass, getterDecorator: (original: () => _TGetSetter) => () => _TGetSetter, setterDecorator: (original: (val: _TGetSetter) => void) => (val: _TGetSetter) => void): void {
    const origin = Object.getOwnPropertyDescriptor(constructor.prototype, key as string);
    if (!origin) return;
    Object.defineProperty(constructor.prototype, key, { get: getterDecorator(origin.get!), set: setterDecorator(origin.set!), enumerable: origin.enumerable, configurable: origin.configurable });
}

export function isInheritedFrom<_TClass>(superClass: pFlex.TCtor<any, _TClass>, target: pFlex.TArray<pFlex.TCtor<any, any>>, ...rest: pFlex.TCtor<any, any>[]): boolean {
    if (typeof superClass !== 'function') return false;
    return pArray.flatter(target, ...rest).every(cls => typeof cls === 'function' && (cls === superClass || cls.prototype instanceof superClass));
}

export function isInheritedFromOr<_TClass>(superClass: pFlex.TCtor<any, _TClass>, target: pFlex.TArray<pFlex.TCtor<any, any>>, ...rest: pFlex.TCtor<any, any>[]): boolean {
    if (typeof superClass !== 'function') return false;

    for(const cls of pArray.flatter(target, ...rest)) {
        if(typeof cls === 'function' && (cls === superClass || cls.prototype instanceof superClass)) { return true }
    }

    return false;
}

export function getInheritedClasses<_TClass>(superClass: pFlex.TCtor<any, _TClass>, list: pFlex.TArray<pFlex.TCtor<any, any>>, each?: (cls: pFlex.TCtor<any, _TClass>) => void): pFlex.TCtor<any, _TClass>[] {
    if (typeof superClass !== 'function') return [];
    return pArray.flatter(list).filter((cls): cls is pFlex.TCtor<any, _TClass> => {
        const isMatch = typeof cls === 'function' && (cls === superClass || cls.prototype instanceof superClass);
        if (isMatch && each) each(cls as pFlex.TCtor<any, _TClass>);
        return isMatch;
    });
}
