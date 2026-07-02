
import * as pArray from "./pArray";
import { editor_ccclass, editor_property } from "./pClass";
import { VOID_FUNC } from "./pConst";
import { uuid } from "./pString";

import { _decorator, js } from 'cc'

/**
 * pAsync: Asynchronous utilities.
 */

const _ = new Map<string, any>();

/**
 * Countdown timer with updater callback.
 * Time: O(n) where n is ticks.
 */
export function countdown(seconds: number, interval: number = 1, updater?: (left: number) => void): Promise<void> {
    const id = uuid();
    let left = seconds;
    return new Promise(rs => {
        const timer = setInterval(() => {
            left -= interval;
            if (updater) updater(Math.max(0, left));
            if (left <= 0) {
                clearInterval(timer);
                _.delete(id);
                rs();
            }
        }, interval * 1000);
        _.set(id, timer);
    });
}

export function wait(seconds: number, id: string = uuid()): Promise<string> {
    return new Promise(rs => {
        const timer = setTimeout(() => {
            _.delete(id);
            rs(id);
        }, seconds * 1000);
        _.set(id, timer);
    });
}

/**
 * Execute a function every N seconds.
 * Recursive pattern for precision.
 */
export async function every(seconds: number, callback: () => void, id: string = uuid()) {
    await wait(seconds, id);
    if (!_.has(id)) return;
    callback();
    every(seconds, callback, id);
}

export function stop(id: string | string[]) {
    const ids = Array.isArray(id) ? id : [id];
    for (const rid of ids) {
        const timer = _.get(rid);
        if (timer) {
            clearTimeout(timer);
            clearInterval(timer);
            _.delete(rid);
        }
    }
}

export function stopAllTimers() {
    _.forEach(timer => {
        clearTimeout(timer);
        clearInterval(timer);
    });
    _.clear();
}

export function isRunning(id: string): boolean {
    return _.has(id);
}

/**
 * Dynamic Promise Resolver.
 * Resolves batches of promises sequentially.
 */
export class DynamicResolver {
    private _batches: Promise<any>[][] = [];
    private _isResolving = false;

    public add(promise: pFlex.TArray<Promise<any>>, ...rest: Promise<any>[]) {
        this._batches.push(pArray.flatter(promise, ...rest));
    }

    public async resolve() {
        if (this._isResolving) return;
        this._isResolving = true;
        
        while (this._batches.length > 0) {
            const batch = this._batches.shift();
            if (batch) await Promise.all(batch);
        }
        
        this._isResolving = false;
    }
}

type _TState = "pending" | 'resolved' | 'rejected' | 'aborted'

type _TExecutor<_T> = pFlex.TFunc<[
    resolver: pFlex.TFunc<[_T], void>,
    rejecter: pFlex.TTFunc.Fail
], void>


const _pool: Task<any>[] = []

@editor_ccclass('pAsync_Task')
export class Task<_T = void> {
    static create<_T = void>(): Task<_T> {
        const _ret = new Task<_T>();
        _ret.recycle();
        return _ret;
    }

    protected constructor() {}

    protected _resolver: pFlex.TFunc<[_T]> = VOID_FUNC
    protected _rejecter: pFlex.TTFunc.Fail = VOID_FUNC
    protected _onCompletes: pFlex.TFunc<[_T]>[] = []
    protected _promise: Promise<_T> = null;

    @editor_property()
    protected _state: _TState = 'aborted'

    get state() { return this._state }

    @editor_property()
    protected _count: number = 0

    protected _result: _T = null

    wait() {
        if(this._state === 'resolved') return Promise.resolve(this._result);
        return this._promise || Promise.resolve(this._result);
    }

    then(func: pFlex.TArray<pFlex.TFunc<[_T]>>, ...funcs: pFlex.TFunc<[_T]>[]) {
        funcs = pArray.flatter(func, ...funcs).filter(Boolean);
        switch(this._state) {
            case "pending": {
                this._onCompletes.push(...funcs);
                break;
            }
            case "resolved": {
                funcs.forEach(_cb => { try { _cb?.(this._result) } catch(e) { console.error("[Async_Task] Callback Error: ", e) }});
                break;
            }
            default: {
                console.warn(`[Async_Task] Is '${this._state}', can not '.then' anything else. Please '.recycle' to re-then again`)
                break;
            }
        }
    }

    recycle() {
        if(this._state === 'pending') {
            //console.warn("[Async_Task] Is already pending, no need to recycle. Please wait for it to complete or `.abort` it if you want to recycle immediately.")
            return;
        }

        this._count ++;
        this._state = 'pending';
        if(!this._promise) {
            this._promise = new Promise<_T>( (_rs, _rj) => {
                this._resolver = _rs;
                this._rejecter = _rj;
            } )
        }

        _pool.push(this);
    }

    abort(cleanup: boolean = true) {
        this._resolve('aborted', null, cleanup)
    }

    resolve(params: _T, cleanup: boolean = true) {
        this._resolve('resolved', params, cleanup)
    }

    reject(error: Error, cleanup: boolean = true) {
        this._resolve('rejected', error, cleanup)
    }

    protected _resolve(state: _TState, params: any, cleanup: boolean) {
        if(this._state !== 'pending') return;

        this._state = 'resolved';

        const _cbs = [...this._onCompletes];
        cleanup && ( this._onCompletes = [] )

        const _rs = this._resolver;
        const _rj = this._rejecter;
        this._rejecter = this._resolver = VOID_FUNC;

        state === 'rejected' ? (_rj(params), this._result = null) : _rs(params);

        if(state === 'resolved') {
            this._result = params;
            _cbs.forEach(_cb => {
                try {
                    _cb?.(params) 
                } catch(e) {
                    console.error("[Async_Task] Callback Error: ", e)
                }
            });
        }
    }
}

interface _IPool {
    rent<_T>(): Task<_T>
    warm(size: number): void

    get size(): number
}


export const Pool = js.createMap<_IPool>(false);

Object.defineProperty(Pool, 'size', { get: () => _pool.length })

Pool.rent = function<_T>() {
    let _task: Task<_T>

    if(_pool.length > 0) {
        _task = _pool.pop() as Task<_T>
        _task.recycle();
    } else {
        _task = Task.create<_T>();
    }

    return _task;
}

Pool.warm = function(size: number) {
    for(let i = 0; i < size; i++) {
        const _task = Task.create();
        _pool.push(_task);
    }
}

