import { editor_ccclass } from "./pClass";

/**
 * Modern Event Driver with Top-Level Exports.
 * Reuses pTS.$.eventify in prototype mode for absolute minimum memory usage.
 */

export interface IDriver<__TInterfaces_ extends Record<string, any>> extends pTS.$.IDriver<__TInterfaces_> {
    set<_TKey extends keyof __TInterfaces_>(event: _TKey, ...listeners: pFlex.THandler<Parameters<__TInterfaces_[_TKey]>, void>[]): void;
    wait<_TKey extends keyof __TInterfaces_>(key: _TKey): Promise<void>;
}

interface _IResolver {
    promise: Promise<void>;
    resolve: pFlex.TTFunc.Void
}

@editor_ccclass("pDriver.Handler")
@pTS.$.eventify
export class Handler<__TInterfaces_ extends Record<string, any>> implements IDriver<__TInterfaces_> {

    public static create<__TInterfaces_ extends Record<string, any>>() {
        const _ret = new Handler<__TInterfaces_>();
        return _ret;
    }

    public declare on: IDriver<__TInterfaces_>['on'];
    public declare once: IDriver<__TInterfaces_>['once'];
    public declare off: IDriver<__TInterfaces_>['off'];
    public declare clear: IDriver<__TInterfaces_>['clear'];

    protected __waiters_: Map<keyof __TInterfaces_, _IResolver> = new Map();

    constructor() {
    }

    public emit<_TKey extends keyof __TInterfaces_>(key: _TKey, ...args: Parameters<__TInterfaces_[_TKey]>): any[] {
        const waiter = this.__waiters_.get(key);
        if (waiter) {
            waiter.resolve();
            this.__waiters_.delete(key);
        }
        return (Handler.prototype as any).emit.call(this, key, ...args);
    }

    public set<_TKey extends keyof __TInterfaces_>(event: _TKey, ...listeners: pFlex.THandler<Parameters<__TInterfaces_[_TKey]>, void>[]): void {
        this.clear(event);
        this.on(event, ...listeners);
    }

    public async wait<_TKey extends keyof __TInterfaces_>(key: _TKey): Promise<void> {
        let waiter = this.__waiters_.get(key);
        if (!waiter) {
            let resolve: () => void;
            const promise = new Promise<void>(r => resolve = r);
            waiter = { promise, resolve };
            this.__waiters_.set(key, waiter);
        }
        return waiter.promise;
    }
}
