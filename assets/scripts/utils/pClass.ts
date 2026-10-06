
import { js, Component, Node, director, _decorator } from "cc";
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

export function emit<_TArg extends any[] = any[], _TReturn = any>(funcs: pFlex.TArray<pFlex.IBinder<_TArg>> | Set<pFlex.IBinder<_TArg>>, ...params: _TArg): any[] {
    if (!funcs) return [];

    const out = []
    if(Array.isArray(funcs)) {
        for(const _func of funcs) {
            out.push(_emit(_func, params))
        }
    } else if(funcs instanceof Set) funcs.forEach(_func => out.push(_emit(_func, params)))
    else out.push(_emit(funcs, params))

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
        const desc = descriptor || (target ? Object.getOwnPropertyDescriptor(target, key) : undefined);
        const isGetter = Boolean(desc && typeof desc.get === 'function');
        const isSetter = Boolean(desc && typeof desc.set === 'function');
        const isAccessor = isGetter || isSetter;
        const isGetterOnly = Boolean(isGetter && !desc?.set);

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
                isGetter: isGetter,
                isGetterOnly: isGetterOnly,
                mode: mode,
                isEditorProp: true,
                serializable: false,
                group: { name: "_Debugger", id: "0" }
            };
            if (!ctor.__pts_editor_props__) ctor.__pts_editor_props__ = new Set<string>();
            ctor.__pts_editor_props__.add(key);

            if (target && target !== ctor) {
                if (!Object.prototype.hasOwnProperty.call(target, '__editor_props__')) {
                    target.__editor_props__ = Object.assign({}, target.__editor_props__ || {});
                }
                target.__editor_props__[key] = ctor.__editor_props__[key];
                if (!target.__pts_editor_props__) target.__pts_editor_props__ = new Set<string>();
                target.__pts_editor_props__.add(key);
            }
        }

        if (!EDITOR) {
            if (opt?.kill && desc?.get) desc.get = () => null;
            return;
        }

        // 2. In EDITOR, register with CCClass @property using dynamic preview visibility
        const options: any = {
            group: { name: "_Debugger", id: "0" },
            readonly: !opt?.writable,
            visible: () => pConst?.EDITOR_ONLY_IN_PREVIEW ?? false
        };
        // In Cocos Creator, every getter is non-serialized by default.
        // Specifying serializable: false or editorOnly: true on any getter/accessor causes an engine error.
        // Only set them on normal fields.
        if (!isAccessor && !isGetter) {
            options.serializable = false;
            options.editorOnly = true;
        }
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
                //@ts-ignore
                js.isChildClassOf = hooked;
                _hasHookedIsChildClassOf = true;
            }
        }
    } catch {}
}

export function isImplementedFrom(superClass: pFlex.TCtorFlex<any, any> | Function | string, targetClass: pFlex.TCtorFlex<any, any> | Function): boolean {
    if (!superClass || typeof targetClass !== 'function') return false;
    let actualSuper: any = superClass;
    let superName = '';
    if (typeof superClass === 'string') {
        superName = superClass;
        actualSuper = js.getClassByName(superClass);
    } else {
        superName = js.getClassName(superClass as any) || (superClass as any).name;
    }

    if (actualSuper && targetClass === actualSuper) return true;
    try {
        if (actualSuper && targetClass.prototype instanceof actualSuper) return true;
    } catch {}

    let cur: any = targetClass;
    const visited = new Set<any>();

    while (cur && cur !== Object && cur !== Function && !visited.has(cur)) {
        visited.add(cur);
        const impls: any = cur[_$Keys.IMPL] || cur['__pTS_implements__'];
        if (impls) {
            if (impls instanceof Set) {
                if ((actualSuper && impls.has(actualSuper)) || (superName && impls.has(superName))) return true;
                for (const contract of impls) {
                    if (typeof contract === 'function' && isImplementedFrom(superClass, contract)) {
                        return true;
                    }
                }
            } else if (Array.isArray(impls)) {
                if ((actualSuper && impls.includes(actualSuper)) || (superName && impls.includes(superName))) return true;
                for (const contract of impls) {
                    if (typeof contract === 'function' && isImplementedFrom(superClass, contract)) {
                        return true;
                    }
                }
            } else if (typeof impls === 'object') {
                //@ts-ignore
                if ((superName && impls[superName]) || (actualSuper && actualSuper in impls)) return true;
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
    hookNodeGetComponent();

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

// --- Component Retrieval with @implement Support ---

function _resolveNode(nodeOrComp: Node | Component | null | undefined): Node | null {
    if (!nodeOrComp) return null;
    if (nodeOrComp instanceof Node) return nodeOrComp;
    if (nodeOrComp instanceof Component) return nodeOrComp.node;
    if ((nodeOrComp as any).node instanceof Node) return (nodeOrComp as any).node;
    return null;
}

/**
 * Checks whether a component implements or inherits from the specified class or contract.
 */
export function isComponentOfContract(
    comp: Component | null | undefined,
    classOrContract: pFlex.TCtor<any, any> | pFlex.TCtorFlex<any, any> | (new (...args: any[]) => any) | Function | string
): boolean {
    if (!comp || !classOrContract) return false;
    const compCtor = comp.constructor as any;
    if (!compCtor) return false;

    if (typeof classOrContract === 'function') {
        if (compCtor === classOrContract) return true;
        try {
            if (comp instanceof (classOrContract as any)) return true;
        } catch {}
        if (isImplementedFrom(classOrContract, compCtor)) return true;
    } else if (typeof classOrContract === 'string') {
        const className = js.getClassName(compCtor) || compCtor.name;
        if (className === classOrContract) return true;

        const resolvedCtor = js.getClassByName(classOrContract);
        if (resolvedCtor) {
            if (compCtor === resolvedCtor) return true;
            try {
                if (comp instanceof resolvedCtor) return true;
            } catch {}
            if (isImplementedFrom(resolvedCtor, compCtor)) return true;
        }

        const impls: any = compCtor[_$Keys.IMPL] || compCtor['__pTS_implements__'];
        if (impls) {
            if (impls instanceof Set && impls.has(classOrContract)) return true;
            if (Array.isArray(impls) && impls.includes(classOrContract)) return true;
            if (typeof impls === 'object' && classOrContract in impls) return true;
        }
    }

    return false;
}

/**
 * Resolves a component from a Node or Component that matches a class or contract.
 * Supports standard inheritance as well as `@implement(Contract)` contracts.
 * 
 * @example
 * ```ts
 * @ccclass('Base')
 * export class Base {}
 * 
 * @ccclass('Comp')
 * @implement(Base)
 * export class Comp extends Component implements Base {}
 * 
 * pClass.getComponent(node, Base); // Returns Comp instance
 * ```
 */
export function getComponent<T = any>(
    nodeOrComp: Node | Component | null | undefined,
    classOrContract: pFlex.TCtor<any, T> | pFlex.TCtorFlex<any, T> | (new (...args: any[]) => T) | Function | string
): T | null {
    if (!nodeOrComp || !classOrContract) return null;
    const node = _resolveNode(nodeOrComp);
    if (!node) return null;

    if (typeof classOrContract === 'function' && (classOrContract === Component || classOrContract.prototype instanceof Component)) {
        const native = _origNodeGetComponent ? _origNodeGetComponent.call(node, classOrContract) : node.getComponent(classOrContract as any);
        if (native) return native as unknown as T;
    }

    const comps: readonly Component[] = (node as any).components || (node as any)._components || node.getComponents(Component) || [];
    for (let i = 0; i < comps.length; i++) {
        const comp = comps[i];
        if (isComponentOfContract(comp, classOrContract)) {
            return comp as unknown as T;
        }
    }

    return null;
}

/**
 * Resolves all components from a Node or Component that match a class or contract.
 */
export function getComponents<T = any>(
    nodeOrComp: Node | Component | null | undefined,
    classOrContract: pFlex.TCtor<any, T> | pFlex.TCtorFlex<any, T> | (new (...args: any[]) => T) | Function | string
): T[] {
    if (!nodeOrComp || !classOrContract) return [];
    const node = _resolveNode(nodeOrComp);
    if (!node) return [];

    const result: T[] = [];
    const comps: readonly Component[] = (node as any).components || (node as any)._components || node.getComponents(Component) || [];
    for (let i = 0; i < comps.length; i++) {
        const comp = comps[i];
        if (isComponentOfContract(comp, classOrContract)) {
            result.push(comp as unknown as T);
        }
    }

    return result;
}

/**
 * Resolves the first component in a Node or any of its descendants that matches a class or contract.
 */
export function getComponentInChildren<T = any>(
    nodeOrComp: Node | Component | null | undefined,
    classOrContract: pFlex.TCtor<any, T> | pFlex.TCtorFlex<any, T> | (new (...args: any[]) => T) | Function | string
): T | null {
    if (!nodeOrComp || !classOrContract) return null;
    const node = _resolveNode(nodeOrComp);
    if (!node) return null;

    const selfComp = getComponent<T>(node, classOrContract);
    if (selfComp) return selfComp;

    const children = node.children || [];
    for (let i = 0; i < children.length; i++) {
        const childComp = getComponentInChildren<T>(children[i], classOrContract);
        if (childComp) return childComp;
    }

    return null;
}

/**
 * Resolves all components in a Node and its descendants that match a class or contract.
 */
export function getComponentsInChildren<T = any>(
    nodeOrComp: Node | Component | null | undefined,
    classOrContract: pFlex.TCtor<any, T> | pFlex.TCtorFlex<any, T> | (new (...args: any[]) => T) | Function | string,
    out: T[] = []
): T[] {
    if (!nodeOrComp || !classOrContract) return out;
    const node = _resolveNode(nodeOrComp);
    if (!node) return out;

    const selfComps = getComponents<T>(node, classOrContract);
    for (let i = 0; i < selfComps.length; i++) {
        out.push(selfComps[i]);
    }

    const children = node.children || [];
    for (let i = 0; i < children.length; i++) {
        getComponentsInChildren<T>(children[i], classOrContract, out);
    }

    return out;
}

let _hasHookedNodeGetComponent = false;
let _origNodeGetComponent: Function | null = null;
let _isResolvingContractComponent = false;

export function hookNodeGetComponent(): void {
    if (_hasHookedNodeGetComponent) return;
    try {
        if (typeof Node !== 'undefined' && Node.prototype) {
            const origGetComponent = Node.prototype.getComponent;
            if (!(origGetComponent as any)?.__pts_hooked__) {
                _origNodeGetComponent = origGetComponent;
                const hooked = function(this: Node, typeOrName: any) {
                    const comp = origGetComponent.call(this, typeOrName);
                    if (comp) return comp;
                    if (_isResolvingContractComponent) return null;
                    _isResolvingContractComponent = true;
                    try {
                        return getComponent(this, typeOrName);
                    } finally {
                        _isResolvingContractComponent = false;
                    }
                };
                (hooked as any).__pts_hooked__ = true;
                Node.prototype.getComponent = hooked as any;
                _hasHookedNodeGetComponent = true;
            }
        }
    } catch {}
}

let _hasHookedSceneFacade = false;
let _lastPClassSearchTarget: any = null;
let _lastPClassSearchTime = 0;

function _enrichNodeTreeContractsTS(node: any): void {
    if (!node) return;
    if (Array.isArray(node.components)) {
        const implKey = Symbol.for('__pTS_implements__');
        node.components.forEach((comp: any) => {
            if (!comp || !comp.type) return;
            const ctor = js.getClassByName(comp.type);
            if (!ctor) return;

            let cur: any = ctor;
            const visited = new Set();
            comp.extends = Array.isArray(comp.extends) ? comp.extends : [];

            while (cur && cur !== Object && cur !== Function && !visited.has(cur)) {
                visited.add(cur);
                const impls = cur[implKey] || cur.__pTS_implements__;
                if (impls) {
                    const addExt = (item: any) => {
                        if (!item) return;
                        const name = typeof item === 'string' ? item : (js.getClassName(item) || item.name);
                        if (name && !comp.extends.includes(name)) {
                            comp.extends.push(name);
                        }
                    };
                    if (impls instanceof Set) {
                        impls.forEach(addExt);
                    } else if (Array.isArray(impls)) {
                        impls.forEach(addExt);
                    } else if (typeof impls === 'object') {
                        Object.keys(impls).forEach(addExt);
                    }
                }
                cur = Object.getPrototypeOf(cur);
            }
        });
    }
    if (Array.isArray(node.children)) {
        node.children.forEach(_enrichNodeTreeContractsTS);
    }
}

function _enrichNodeTreeForSearchTS(node: any, targetType: any): void {
    if (!node) return;

    if (Array.isArray(node.components) && node.components.length > 0) {
        const virtualChildren: any[] = [];
        const compsToRemove = new Set<any>();

        // 1. Duplicate components of the exact same type
        const typeGroups = new Map<string, any[]>();
        for (const comp of node.components) {
            if (!comp || !comp.type) continue;
            if (!typeGroups.has(comp.type)) typeGroups.set(comp.type, []);
            typeGroups.get(comp.type)!.push(comp);
        }

        for (const [type, comps] of typeGroups.entries()) {
            if (comps.length > 1) {
                comps.forEach((comp, idx) => {
                    compsToRemove.add(comp);
                    virtualChildren.push({
                        name: `${node.name} [${type} #${idx + 1}]`,
                        uuid: node.uuid,
                        components: [comp],
                        children: []
                    });
                });
            }
        }

        // 2. Multiple components matching search target (contracts/subtypes)
        if (targetType) {
            const targetName = typeof targetType === 'string' ? targetType : (js.getClassName(targetType) || targetType.name);
            const remainingComps = node.components.filter((c: any) => !compsToRemove.has(c));
            const matchingComps = remainingComps.filter((c: any) => {
                if (!c) return false;
                if (c.type === targetName) return true;
                if (Array.isArray(c.extends) && c.extends.includes(targetName)) return true;
                return false;
            });

            if (matchingComps.length > 1) {
                const subTypeCount = new Map<string, number>();
                matchingComps.forEach((c: any) => {
                    subTypeCount.set(c.type, (subTypeCount.get(c.type) || 0) + 1);
                });
                const subTypeIdx = new Map<string, number>();

                matchingComps.forEach((comp: any) => {
                    compsToRemove.add(comp);
                    const totalForType = subTypeCount.get(comp.type) || 1;
                    let label = `${node.name} [${comp.type}]`;
                    if (totalForType > 1) {
                        const curIdx = (subTypeIdx.get(comp.type) || 0) + 1;
                        subTypeIdx.set(comp.type, curIdx);
                        label = `${node.name} [${comp.type} #${curIdx}]`;
                    }
                    virtualChildren.push({
                        name: label,
                        uuid: node.uuid,
                        components: [comp],
                        children: []
                    });
                });
            }
        }

        if (compsToRemove.size > 0) {
            node.components = node.components.filter((c: any) => !compsToRemove.has(c));
            node.children = Array.isArray(node.children) ? node.children : [];
            node.children.push(...virtualChildren);
        }
    }

    if (Array.isArray(node.children)) {
        node.children.forEach(child => _enrichNodeTreeForSearchTS(child, targetType));
    }
}

export function hookSceneFacadeManager(): void {
    if (_hasHookedSceneFacade) return;
    try {
        const cce = (globalThis as any).cce;
        if (!cce || !cce.SceneFacadeManager) return;
        const mgr = cce.SceneFacadeManager;
        const targets = [mgr];
        if (mgr.constructor && mgr.constructor.prototype) {
            targets.push(mgr.constructor.prototype);
        }

        targets.forEach(target => {
            if (target && target.queryClasses && !target.queryClasses.__pts_hooked__) {
                const origQueryClasses = target.queryClasses;
                const hooked = async function(this: any, options: any, ...rest: any[]) {
                    _lastPClassSearchTime = Date.now();
                    _lastPClassSearchTarget = (options && options.extends) ? options.extends : null;
                    return origQueryClasses.call(this, options, ...rest);
                };
                hooked.__pts_hooked__ = true;
                target.queryClasses = hooked;
            }

            if (target && target.queryNodeTree && !target.queryNodeTree.__pts_hooked__) {
                const origQueryNodeTree = target.queryNodeTree;
                const hooked = async function(this: any, ...args: any[]) {
                    const tree = await origQueryNodeTree.apply(this, args);
                    if (tree) {
                        _enrichNodeTreeContractsTS(tree);
                        const isSearch = (Date.now() - _lastPClassSearchTime) < 2000;
                        if (isSearch) {
                            const target = _lastPClassSearchTarget;
                            _lastPClassSearchTime = 0;
                            _enrichNodeTreeForSearchTS(tree, target);
                        }
                    }
                    return tree;
                };
                hooked.__pts_hooked__ = true;
                target.queryNodeTree = hooked;
                _hasHookedSceneFacade = true;
            }
        });
    } catch {}
}

hookNodeGetComponent();
hookSceneFacadeManager();


