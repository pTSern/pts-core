
import { js, Component, director, _decorator } from "cc";
import { DEV, EDITOR, EDITOR_NOT_IN_PREVIEW } from "cc/env";
import * as pArray from "./pArray";
import * as pConst from "./pConst";
import * as cc from 'cc';
import { CC_IEnumable, CC_IEnumList } from "../interfaces/cc/CC.IEnumable";

/**
 * pClass: All class-based patterns, binders, and decorators.
 */

const _$Map: Record<pFlex.TKey, pFlex.TFunc> = js.createMap();
const _$Pool: WeakMap<pFlex.TCtor, Record<pFlex.TKey, any>> = new WeakMap();
const _$Keys = pConst?.KEYS?.SINGLETON || {
    INSTANCE: Symbol('__pTS_instance__'),
    GETTER: Symbol('__pTS_get_instance__'),
    OPTION: Symbol('__pTS_option__'),
    IMPL: Symbol.for('__pTS_implements__'),
};
const _$Waiter = new Map<Function, { promise: Promise<any>, resolve: pFlex.TFunc, resolved: boolean }>();

// --- Helpers ---

function _resolver(constructor: pFlex.TCtor) {
    let data = _$Waiter.get(constructor);
    if (!data) {
        data = { promise: Promise.resolve(), resolve: null, resolved: true };
        _$Waiter.set(constructor, data);
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

const _$list = new WeakMap();
export function actExtractProp(_class: pFlex.TCtor) {
    const instance = _$list.get(_class) || new _class();
    _$list.set(_class, instance);
  
    return Object.keys(instance).filter(
        (key) => typeof instance[key] !== "function"
    );
}

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
    return !!binder ? func.call(binder, ..._params) : func(..._params)
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
    let data = _$Waiter.get(constructor);
    if (!data) {
        let resolve: any;
        const promise = new Promise<T>(rs => resolve = rs);
        data = { promise, resolve, resolved: false };

        _$Waiter.set(constructor, data);
    }
    data.promise.then(_ => console.log(`[Singleton] ${js.getClassName(constructor)} has been initialized.`, _));
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
    return (target: any) => {
        logger && _logger(target, name);
        if (target) {
            target.__is_editor_class__ = true;
            target.__editor_class_mode__ = mode;
        }
        return (EDITOR || _$hould(mode)) ? _decorator.ccclass(name)(target) : void 0;
    };
}

export const editor_class = editor_ccclass;

export function logcat(who: any, method: 'log' | 'warn' | 'error') {
    const _target = who['_$L'] || console;

    return _target[method] as pFlex.TFunc<any, void>
}

function _$hould(mode: _TMode) {
    let should = false;

    const isPreview = pConst?.EDITOR_ONLY_IN_PREVIEW ?? (EDITOR && !EDITOR_NOT_IN_PREVIEW);

    if (mode === 'EDITOR_NOT_IN_PREVIEW') should = (EDITOR && EDITOR_NOT_IN_PREVIEW);
    else if (mode === 'EDITOR') should = EDITOR;
    else if (mode === 'EDITOR_ONLY_IN_PREVIEW') should = isPreview;
    else if (mode === 'RUNTIME') should = (!EDITOR) || isPreview;

    return should;
}

export function editor_property(type?: any, opt?: { name?: string, multiline?: boolean, override?: boolean, kill?: boolean, writable?: boolean }, mode: _TMode = 'EDITOR_ONLY_IN_PREVIEW') {
    return (target: any, key: string, descriptor?: PropertyDescriptor) => {
        // 1. Always record metadata on constructor and prototype for inspector runtime reflection
        const ctor = typeof target === 'function' ? target : target?.constructor;
        if (ctor) {
            if (!Object.prototype.hasOwnProperty.call(ctor, '__editor_props__')) {
                ctor.__editor_props__ = Object.assign({}, ctor.__editor_props__ || {});
            }
            ctor.__editor_props__[key] = {
                key,
                targetClass: ctor.name || '',
                name: opt?.name || key,
                type: type,
                readonly: !opt?.writable,
                multiline: !!opt?.multiline,
                override: !!opt?.override,
                isGetter: !!descriptor?.get,
                mode: mode,
                group: { name: "_Debugger", id: "0" }
            };
            if (target && target !== ctor) {
                if (!Object.prototype.hasOwnProperty.call(target, '__editor_props__')) {
                    target.__editor_props__ = Object.assign({}, target.__editor_props__ || {});
                }
                target.__editor_props__[key] = ctor.__editor_props__[key];
            }
        }

        if (!EDITOR) {
            if (opt?.kill && descriptor?.get) descriptor.get = () => null;
            return;
        }

        // 2. In EDITOR, register with CCClass @property using dynamic preview visibility
        const options: any = {
            group: { name: "_Debugger", id: "0" },
            readonly: !opt?.writable,
            visible: () => pConst?.EDITOR_ONLY_IN_PREVIEW ?? false
        };
        if (type) options.type = type;
        if (opt?.name) options.displayName = opt.name;
        if (opt?.multiline) options.multiline = true;
        if (opt?.override) options.override = true;

        try {
            return descriptor
                ? _decorator.property(options)(target, key, descriptor)
                : _decorator.property(options)(target, key);
        } catch (e) {
            // Silently catch if decorator applied outside ccclass
        }
    };
}

export function logger(name?: string) {
    return (constructor: pFlex.TCtor) => {
        const className = name || js.getClassName(constructor);
        const levels = pConst?.LOG_LEVELS || ['log', 'warn', 'error'];
        for (const level of levels) {
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
    if (typeof _ctor === 'string') return _$Map[_ctor]?.(...args) ?? null;
    const getter = _ctor[_$Keys.GETTER];
    if (getter) return getter(...args);
    return _ctor[_$Keys.INSTANCE];
}

export function singleton(opt?: { initer?: string, destroyer?: string, wake?: 'Instantly' | 'None', pooler?: boolean, async?: boolean, name?: string, setup?: boolean }) {
    return (constructor: pFlex.TCtor) => {
        const isComp = constructor.prototype instanceof Component;
        const config = {
            initer: isComp ? 'onLoad' : '_init',
            destroyer: isComp ? 'onDestroy' : '_clean',
            wake: isComp ? 'None' : 'Instantly',
            pooler: false,
            async: false,
            setup: isComp ? false : true,
            ...opt 
        };
        constructor[_$Keys.OPTION] = config;

        const _oIniter = constructor.prototype[config.initer];
        constructor.prototype[config.initer] = async function(...args: any[]) {
            const _prm = _oIniter?.apply(this, ...args)
            if(_prm instanceof Promise) {
                await _prm;
            }
            constructor[_$Keys.INSTANCE] = this;
            console.log(`[Singleton] ${js.getClassName(constructor)} initialized.`);
            _resolver(constructor);
        };

        if (isComp) {
            constructor[_$Keys.GETTER] = (...args: any[]) => {
                if (!constructor[_$Keys.INSTANCE]) {
                    constructor[_$Keys.INSTANCE] = director.getScene()?.getComponentInChildren(constructor);
                    if (constructor[_$Keys.INSTANCE]) {
                        config.setup && constructor[_$Keys.INSTANCE][config.initer]?.(...args);
                        _resolver(constructor);
                    }
                }
                return constructor[_$Keys.INSTANCE];
            };
        } else {
            constructor[_$Keys.GETTER] = (...args: any[]) => {
                if (!constructor[_$Keys.INSTANCE]) {
                    constructor[_$Keys.INSTANCE] = new constructor(...args);
                    config.setup && constructor[_$Keys.INSTANCE][config.initer]?.(...args);
                    console.log(`[Singleton] ${js.getClassName(constructor)} QUICK GET.`, constructor[_$Keys.INSTANCE]);
                    _resolver(constructor);
                }
                return constructor[_$Keys.INSTANCE];
            };
        }
        if (config.wake === 'Instantly') instance(constructor);

        const originDestroyer = constructor.prototype[config.destroyer];
        constructor.prototype[config.destroyer] = function(...args: any[]) {
            originDestroyer?.apply(this, args);
            constructor[_$Keys.INSTANCE] = null;
        };

        if (config.pooler) _$Map[config.name || js.getClassName(constructor)] = constructor[_$Keys.GETTER];
    };
}

declare const Editor: any;

let _hasHookedIsChildClassOf = false;
export function hookJsIsChildClassOf(): void {
    if (_hasHookedIsChildClassOf) return;
    try {
        if (typeof js !== 'undefined' && typeof js.isChildClassOf === 'function') {
            const origIsChild = js.isChildClassOf;
            if (!(origIsChild as any).__pts_hooked__) {
                const hooked = function(subClass: any, superClass: any) {
                    if (origIsChild(subClass, superClass)) return true;
                    if (typeof subClass === 'function' && typeof superClass === 'function') {
                        return isImplementedFrom(superClass, subClass);
                    }
                    return false;
                };
                (hooked as any).__pts_hooked__ = true;
                js.isChildClassOf = hooked;
                _hasHookedIsChildClassOf = true;
            }
        }
    } catch {}
}

export function isImplementedFrom(superClass: pFlex.TCtorFlex<any, any> | Function, targetClass: pFlex.TCtorFlex<any, any> | Function): boolean {
    if (typeof superClass !== 'function' || typeof targetClass !== 'function') return false;
    if (targetClass === superClass) return true;
    try {
        if (targetClass.prototype instanceof superClass) return true;
    } catch {}

    const superName = js.getClassName(superClass as any) || (superClass as any).name;
    let cur: any = targetClass;
    const visited = new Set<any>();

    while (cur && cur !== Object && cur !== Function && !visited.has(cur)) {
        visited.add(cur);
        const impls: any = cur[_$Keys.IMPL] || cur['__pTS_implements__'];
        if (impls) {
            if (impls instanceof Set) {
                if (impls.has(superClass) || (superName && impls.has(superName))) return true;
                for (const contract of impls) {
                    if (typeof contract === 'function' && isImplementedFrom(superClass, contract)) {
                        return true;
                    }
                }
            } else if (Array.isArray(impls)) {
                if (impls.includes(superClass) || (superName && impls.includes(superName))) return true;
                for (const contract of impls) {
                    if (typeof contract === 'function' && isImplementedFrom(superClass, contract)) {
                        return true;
                    }
                }
            } else if (typeof impls === 'object') {
                if (impls[superName] || (superClass in impls)) return true;
                for (const key of Object.keys(impls)) {
                    const c = js.getClassByName(key);
                    if (c && isImplementedFrom(superClass, c)) return true;
                }
            }
        }
        cur = Object.getPrototypeOf(cur);
    }
    return false;
}

export function hookHasInstance(contract: any): void {
    if (typeof contract !== 'function') return;
    if ((contract[Symbol.hasInstance] as any)?.__pts_custom__) return;

    const originalHasInstance = contract[Symbol.hasInstance] || Function.prototype[Symbol.hasInstance];
    const customHasInstance = function(this: any, instance: any) {
        if (!instance) return false;
        try {
            if (originalHasInstance.call(this, instance)) return true;
        } catch {}
        const ctor = typeof instance === 'function' ? instance : instance?.constructor;
        if (ctor && isImplementedFrom(this, ctor)) return true;
        return false;
    };
    (customHasInstance as any).__pts_custom__ = true;
    try {
        Object.defineProperty(contract, Symbol.hasInstance, {
            value: customHasInstance,
            configurable: true,
            writable: true
        });
    } catch {}
}

function isPtsAssetOrComponent(cls: any): boolean {
    if (!cls || typeof cls !== 'function') return false;
    if (cls === Component || cls.prototype instanceof Component) return true;
    let cur = cls;
    while (cur && cur !== Object && cur !== Function) {
        const name = cur.name || js.getClassName(cur);
        if (name === 'pTSAsset' || name === 'pTSAsset_Data' || name === 'Component') return true;
        cur = Object.getPrototypeOf(cur);
    }
    return false;
}

function validateContractImplementation(target: any, contract: any): string[] {
    const missing: string[] = [];
    if (!target || !contract) return missing;

    // 1. Check prototype methods and accessors (excluding constructor)
    const proto = contract.prototype;
    if (proto) {
        const descs = Object.getOwnPropertyDescriptors(proto);
        for (const [key, desc] of Object.entries(descs)) {
            if (key === 'constructor') continue;
            const targetDesc = Object.getOwnPropertyDescriptor(target.prototype, key);
            if (!targetDesc && !(key in target.prototype)) {
                missing.push(key);
            }
        }
    }

    // 2. Check decorated properties / instance fields
    const contractProps: string[] = [];
    if (contract.__editor_props__) {
        contractProps.push(...Object.keys(contract.__editor_props__));
    }
    if (Array.isArray(contract.__props__)) {
        contractProps.push(...contract.__props__);
    }
    try {
        const instProps = actExtractProp(contract);
        if (Array.isArray(instProps)) {
            contractProps.push(...instProps);
        }
    } catch {}

    for (const prop of contractProps) {
        if (prop === '__editorExtras__' || prop === '_objFlags' || prop === '_name' || prop === '_callbackTable') continue;
        const hasOnProto = prop in target.prototype;
        const hasOnEditorProps = !!target.__editor_props__?.[prop];
        const hasOnProps = Array.isArray(target.__props__) && target.__props__.includes(prop);
        let hasOnInstance = false;
        try {
            const targetInstProps = actExtractProp(target);
            hasOnInstance = Array.isArray(targetInstProps) && targetInstProps.includes(prop);
        } catch {}

        if (!hasOnProto && !hasOnEditorProps && !hasOnProps && !hasOnInstance) {
            if (!missing.includes(prop)) {
                missing.push(prop);
            }
        }
    }

    return missing;
}

export function implement<TContracts extends (pFlex.TCtorFlex<any, any> | pFlex.TCtor<any, any> | string)[]>(
    ...contracts: TContracts
) {
    hookJsIsChildClassOf();

    const flatContracts: any[] = pArray.flatter(contracts);

    for (const contract of flatContracts) {
        if (typeof contract === 'function') {
            hookHasInstance(contract);
        }
    }

    return function <TTarget extends pFlex.TCtorFlex<any, any> | Function>(target: TTarget): TTarget {
        if (!target || typeof target !== 'function') return target;

        const targetCtor = target as any;
        const targetName = targetCtor.name || js.getClassName(targetCtor) || 'UnknownClass';

        // 1. Validation: target class must extend Component or pTSAsset
        if (!isPtsAssetOrComponent(targetCtor)) {
            const errMsg = `[@implement] Invalid Target: Class "${targetName}" must extend either pTSAsset or Component! Base classes cannot be instantiated or checked by Cocos Creator properly.`;
            console.error(errMsg);
            if ((EDITOR || DEV) && typeof Editor !== 'undefined' && Editor.Dialog && typeof Editor.Dialog.warn === 'function') {
                try {
                    Editor.Dialog.warn({ title: '@implement Constraint Error', message: errMsg });
                } catch {}
            }
        }

        // 2. Register implementations on target constructor
        if (!targetCtor[_$Keys.IMPL]) {
            targetCtor[_$Keys.IMPL] = new Set<any>();
        }
        if (!targetCtor.__pTS_implements__) {
            targetCtor.__pTS_implements__ = targetCtor[_$Keys.IMPL];
        }

        for (const contract of flatContracts) {
            if (!contract) continue;
            targetCtor[_$Keys.IMPL].add(contract);
            if (typeof contract === 'string') {
                const ctor = js.getClassByName(contract);
                if (ctor) {
                    targetCtor[_$Keys.IMPL].add(ctor);
                    hookHasInstance(ctor);
                }
            } else if (typeof contract === 'function') {
                const cName = js.getClassName(contract) || contract.name;
                if (cName) {
                    targetCtor[_$Keys.IMPL].add(cName);
                }

                // 3. Dev / Editor safety verification: verify implemented properties
                if (EDITOR || DEV) {
                    const missing = validateContractImplementation(targetCtor, contract);
                    if (missing.length > 0) {
                        const warnMsg = `[@implement] Type Check Error: Class "${targetName}" declares @implement(${cName || 'Contract'}), but is missing implementation for: [${missing.join(', ')}].`;
                        console.error(warnMsg);
                        if (typeof Editor !== 'undefined' && Editor.Dialog && typeof Editor.Dialog.warn === 'function') {
                            try {
                                Editor.Dialog.warn({
                                    title: '@implement Type Check Error',
                                    message: `Class "${targetName}" does not implement contract "${cName}".\nMissing properties/methods:\n- ${missing.join('\n- ')}`
                                });
                            } catch {}
                        }
                    }
                }
            }
        }

        return target;
    };
}

export function imps(...contracts: (pFlex.TCtorFlex<any, any> | pFlex.TCtor<any, any> | string)[]) {
    return implement(...contracts);
}

export function persistent(opt: { key: string, initer?: string, destroyer?: string }) {
    return (constructor: pFlex.TCtor) => {
        let pool = _$Pool.get(constructor);
        if (!pool) { pool = js.createMap(); _$Pool.set(constructor, pool); }
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
    return pArray.flatter(target, ...rest).every(cls => typeof cls === 'function' && (cls === superClass || cls.prototype instanceof superClass || isImplementedFrom(superClass, cls)));
}

export function isInheritedFromOr<_TClass>(superClass: pFlex.TCtor<any, _TClass>, target: pFlex.TArray<pFlex.TCtor<any, any>>, ...rest: pFlex.TCtor<any, any>[]): boolean {
    if (typeof superClass !== 'function') return false;

    for(const cls of pArray.flatter(target, ...rest)) {
        if(typeof cls === 'function' && (cls === superClass || cls.prototype instanceof superClass || isImplementedFrom(superClass, cls))) { return true; }
    }

    return false;
}

export function getInheritedClasses<_TClass>(superClass: pFlex.TCtor<any, _TClass>, list: pFlex.TArray<pFlex.TCtor<any, any>>, each?: (cls: pFlex.TCtor<any, _TClass>) => void): pFlex.TCtor<any, _TClass>[] {
    if (typeof superClass !== 'function') return [];
    return pArray.flatter(list).filter((cls): cls is pFlex.TCtor<any, _TClass> => {
        const isMatch = typeof cls === 'function' && (cls === superClass || cls.prototype instanceof superClass || isImplementedFrom(superClass, cls));
        if (isMatch && each) each(cls as pFlex.TCtor<any, _TClass>);
        return isMatch;
    });
}

