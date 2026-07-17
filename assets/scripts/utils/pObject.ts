
import { js } from "cc";

/**
 * pObject: Object utilities with Proxy support.
 */

const _pool = new Set<pFlex.TKey>();

/**
 * Register a key in the global pool. Returns false if already exists.
 */
export function bind(key: pFlex.TKey): boolean {
    if (_pool.has(key)) return false;
    _pool.add(key);
    return true;
}

export function actRevertMap<TValue, TKey extends object>(weaker: Map<TKey, TValue>, keySelector?: (val: TValue) => string): Map<string, TKey> {
    const result = new Map<string, TKey>();
    for (const [key, value] of weaker.entries()) {
        const k = keySelector ? keySelector(value) : (typeof key === 'string' ? key : String(key));
        result.set(k, key);
    }
    return result;
}

/**
 * Deep clone an object.
 * Logic: Uses structuredClone if available (modern browsers), otherwise falls back to JSON.
 */
export function clone<T>(target: T): T {
    if (target === null || typeof target !== 'object') return target;
    
    // @ts-ignore
    if (typeof structuredClone === 'function') return structuredClone(target);
    
    try {
        return JSON.parse(JSON.stringify(target));
    } catch (e) {
        // Fallback to shallow clone if circular
        return Array.isArray(target) ? [...target] as any : { ...target };
    }
}

/**
 * Copy properties from source to target using engine utility.
 */
export function copy(source: object, target: object) {
    js.mixin(target, source);
}

/**
 * Merge source into target.
 * Supports Proxy for lazy resolution.
 */
export function assign<T extends object>(target: T, source: any, useProxy: boolean = false): T {
    if (!source) return target;
    if (!useProxy) return Object.assign(target, source);

    return new Proxy(target, {
        get(obj, prop) {
            if (prop in obj && (obj as any)[prop] !== undefined) return (obj as any)[prop];
            return source[prop];
        },
        has(obj, prop) {
            return prop in obj || prop in source;
        }
    }) as T;
}

export function keys<_TKey extends pFlex.TKey, _TValue>(obj: pFlex.TRecorder<_TKey, _TValue>, callback: (key: _TKey) => void) {
    if (!obj) return;
    for (const key in obj) {
        callback(key as _TKey);
    }
}

export function entries<_TKey extends pFlex.TKey, _TValue>(obj: pFlex.TRecorder<_TKey, _TValue>, callback: (key: _TKey, value: _TValue) => void) {
    if (!obj) return;
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            callback(key as _TKey, (obj as any)[key]);
        }
    }
}

/**
 * Check if a property is a flex key (string, number, or symbol).
 */
export function isFlexKey(target: any): target is pFlex.TKey {
    const type = typeof target;
    return type === 'string' || type === 'number' || type === 'symbol';
}

/**
 * Check if a property is a getter without a setter.
 */
export function isReadOnlyProperty(obj: any, propName: string): boolean {
    let proto = obj;
    while (proto !== null) {
        const desc = Object.getOwnPropertyDescriptor(proto, propName);
        if (desc) return !!desc.get && !desc.set;
        proto = Object.getPrototypeOf(proto);
    }
    return false;
}

export function actChainBinder(chain: pFlex.TArray<string>, global: any = window, def: pFlex.TFunc<[string], any> = () => {}) {
    let _chains: string[] = null

    if (Array.isArray(chain)) {
        _chains = chain.map(_ => _.replace(/,/g, ""))
    } else {
        _chains = chain.replace(/,/g, "").split('.');
    }

    if (!_chains || _chains.length <= 0) return;

    let current = global;
    for (let i = 0; i < _chains.length; i++) {
        const key = _chains[i];
        if (!key) continue;

        current[key] = current[key] || def(key);
        current = current[key];
    }

    return current;
}
