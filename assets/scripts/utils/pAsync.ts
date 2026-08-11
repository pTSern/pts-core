
import * as pArray from "./pArray";
import { editor_ccclass, editor_property } from "./pClass";
import { VOID_FUNC, RESOLVER } from "./pConst";
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

/**
 * Guard handle returned by `Mutex.lock()`.
 * Call to release the lock. Idempotent — safe to call multiple times.
 */
export type MutexGuard = () => void;

/**
 * Expert-level Mutex for async operation coordination.
 *
 * Ensures mutual exclusion over async critical sections with FIFO fairness,
 * RAII-style scoping, poison detection, and diagnostic introspection.
 *
 * Modeled after Rust's `std::sync::Mutex` and C++'s `std::mutex`.
 *
 * Time: O(1) lock/unlock, O(n) queue drain.
 * Space: O(n) where n is concurrent waiters.
 *
 * @example
 * ```ts
 * // Manual lock/unlock (C++ style)
 * const release = await mutex.lock();
 * try { /* critical section *\/ } finally { release(); }
 *
 * // Scoped lock (Rust style — preferred)
 * const result = await mutex.scope(async () => {
 *     return await exclusiveWork();
 * });
 *
 * // Non-blocking attempt
 * const guard = mutex.tryLock();
 * if (guard) { /* got it *\/ guard(); }
 *
 * // Timed attempt
 * const guard = await mutex.tryLockFor(2);
 * if (guard) { /* acquired within 2s *\/ guard(); }
 * ```
 */
export class Mutex {
    private _queue: Promise<void> = RESOLVER;
    private _locked: boolean = false;
    private _waiters: number = 0;
    private _poisoned: boolean = false;
    private _poisonError: Error | null = null;
    private _owner: string | null = null;

    /** Whether the mutex is currently held. */
    get isLocked(): boolean { return this._locked; }

    /** Number of operations waiting to acquire. */
    get waiters(): number { return this._waiters; }

    /** Whether a previous holder threw during `scope()`, tainting the mutex. */
    get isPoisoned(): boolean { return this._poisoned; }

    /** Debug tag of the current holder, if provided via `owner` param. */
    get owner(): string | null { return this._owner; }

    /**
     * Acquire the lock. Returns a guard function to release it.
     *
     * FIFO-ordered — callers acquire in the order they called `lock()`.
     * The returned guard is idempotent; calling it multiple times is safe.
     *
     * @param owner  Optional debug tag identifying the holder.
     * @throws If the mutex is poisoned.
     *
     * @example
     * ```ts
     * const release = await mutex.lock('playerUpdate');
     * try { /* critical section *\/ } finally { release(); }
     * ```
     */
    async lock(owner?: string): Promise<MutexGuard> {
        this._throwIfPoisoned();

        this._waiters++;

        let _release: pFlex.TTFunc.Void;
        const _next = new Promise<void>(rs => _release = rs);
        const _prev = this._queue;
        this._queue = this._queue.then(() => _next);

        await _prev;

        this._waiters--;
        this._locked = true;
        this._owner = owner ?? null;

        return this._createGuard(_release);
    }

    /**
     * Non-blocking lock attempt. Returns a guard if free, `null` if contended.
     *
     * Like Rust's `Mutex::try_lock()` or C++'s `std::mutex::try_lock()`.
     * Never waits — O(1) synchronous check.
     *
     * @param owner  Optional debug tag identifying the holder.
     * @returns Guard function if acquired, `null` if contended or poisoned.
     */
    tryLock(owner?: string): MutexGuard | null {
        if (this._locked || this._poisoned) return null;

        this._locked = true;
        this._owner = owner ?? null;

        let _release: pFlex.TTFunc.Void;
        const _next = new Promise<void>(rs => _release = rs);
        this._queue = this._queue.then(() => _next);

        return this._createGuard(_release);
    }

    /**
     * Timed lock attempt. Waits up to `seconds` before giving up.
     *
     * Like C++'s `std::timed_mutex::try_lock_for()`.
     * If the timeout fires while queued, the internal slot is auto-released
     * so the queue is never stalled by an abandoned waiter.
     *
     * @param seconds  Maximum time to wait.
     * @param owner    Optional debug tag identifying the holder.
     * @returns Guard function if acquired within the deadline, `null` on timeout.
     */
    async tryLockFor(seconds: number, owner?: string): Promise<MutexGuard | null> {
        if (this._poisoned) return null;

        let timedOut = false;
        let acquired: MutexGuard | null = null;

        const lockPromise = this.lock(owner).then(guard => {
            if (timedOut) { guard(); return; }   // too late — auto-release the slot
            acquired = guard;
        });

        const timeoutPromise = wait(seconds).then(() => { timedOut = true; });

        await Promise.race([lockPromise, timeoutPromise]);
        return acquired;
    }

    /**
     * RAII-style scoped lock. Acquires, runs `fn`, and auto-releases — even on throw.
     *
     * If `fn` throws, the mutex is **poisoned** (Rust semantics). Subsequent `lock()`
     * calls will throw until `clearPoison()` is called. The error is re-thrown.
     *
     * @param fn     Critical section to execute under the lock.
     * @param owner  Optional debug tag identifying the holder.
     * @returns The return value of `fn`.
     *
     * @example
     * ```ts
     * const data = await mutex.scope(async () => {
     *     return await fetchExclusiveResource();
     * }, 'resourceFetch');
     * ```
     */
    async scope<_T>(fn: () => _T | Promise<_T>, owner?: string): Promise<_T> {
        const release = await this.lock(owner);
        try {
            return await fn();
        } catch (e) {
            this._poisoned = true;
            this._poisonError = e instanceof Error ? e : new Error(String(e));
            throw e;
        } finally {
            release();
        }
    }

    /**
     * Clear the poisoned state, allowing the mutex to be used again.
     * Like recovering from Rust's `PoisonError`.
     *
     * @returns The error that caused the poisoning, or `null`.
     */
    clearPoison(): Error | null {
        const err = this._poisonError;
        this._poisoned = false;
        this._poisonError = null;
        return err;
    }

    /**
     * Hard reset to initial unlocked, unpoisoned state.
     * **Dangerous** — any queued waiters will be orphaned. Use only for teardown.
     */
    reset() {
        this._queue = RESOLVER;
        this._locked = false;
        this._waiters = 0;
        this._owner = null;
        this.clearPoison();
    }

    // ── Internals ─────────────────────────────────────────────

    private _createGuard(release: pFlex.TTFunc.Void): MutexGuard {
        let released = false;
        return () => {
            if (released) return;           // idempotent — double-release is no-op
            released = true;
            this._locked = this._waiters > 0;  // stays locked if others are queued
            this._owner = null;
            release();
        };
    }

    private _throwIfPoisoned() {
        if (this._poisoned) {
            throw new Error(`[Mutex] Poisoned by prior holder: ${this._poisonError?.message ?? 'unknown error'}`);
        }
    }
}



