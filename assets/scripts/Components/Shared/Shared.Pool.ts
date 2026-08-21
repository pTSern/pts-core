import { _decorator, CCInteger, Component, js } from 'cc';
import { pConst, pLazy } from '../../utils';
import { Dictionary_Persistent } from '../../helper/Dictionary/Dictionary.Persistent';
import { Helper_IdSelector } from '../../helper/Helper.IdSelector';

const { ccclass, property } = _decorator;

enum _EMode {
    Set = 1,
    Get = 2,
}

pLazy.enums(_EMode);

type _TCtor<T> = new (...args: any[]) => Shared_Pool<T>;

@ccclass('Shared_Pool')
export abstract class Shared_Pool<_TClass> extends Component {
    private static _$pool = new Dictionary_Persistent<string, any>()
    private static _$waiters = js.createMap(true);
    protected static _prefix: string = "";

    private static _key(this: any, _key: string | Helper_IdSelector<any>) {
        const prefix = this?._prefix ?? Shared_Pool._prefix ?? "";
        return prefix + (_key instanceof Helper_IdSelector ? _key.sid : _key);
    }

    static take<T>(this: new (...args: any[]) => Shared_Pool<T>, key: string | Helper_IdSelector<any>): T | undefined;
    static take<T>(key: Helper_IdSelector<T>): T | undefined;
    static take<T = any>(key: string | Helper_IdSelector<any>): T | undefined;
    static take(this: any, key: string | Helper_IdSelector<any>): any {
        const fullKey = (this?._key ? this._key(key) : Shared_Pool._key(key));
        return Shared_Pool._$pool.get(fullKey);
    }

    static await<T>(this: new (...args: any[]) => Shared_Pool<T>, key: string | Helper_IdSelector<any>): Promise<T>;
    static await<T>(key: Helper_IdSelector<T>): Promise<T>;
    static await<T = any>(key: string | Helper_IdSelector<any>): Promise<T>;
    static await(this: any, key: string | Helper_IdSelector<any>): Promise<any> {
        const fullKey = (this?._key ? this._key(key) : Shared_Pool._key(key));

        let _out = Shared_Pool._$waiters[fullKey];
        if(!_out) {
            _out = Shared_Pool._$waiters[fullKey] = new Promise<any>(_rs => {
                const _ret = Shared_Pool._$pool.get(fullKey, _ => _rs(_));
                _ret && _rs(_ret);
            });
        }

        return _out;
    }

    @property({ group: pConst.GROUPS.CORE })
    isShared: boolean = true;

    @property({ type: Helper_IdSelector, visible() { return this.isShared }, group: pConst.GROUPS.CORE })
    hid: Helper_IdSelector = new Helper_IdSelector();

    @property({ type: _EMode, visible() { return this.isShared }, group: pConst.GROUPS.CORE })
    mode: _EMode = _EMode.Set;

    @property({ type: CCInteger, min: 0, visible() { return this.mode === _EMode.Set && this.isShared }, group: pConst.GROUPS.CORE })
    state: number = 5;

    abstract target: _TClass;
    protected _onPoolSetSuccess?: pFlex.TFunc<[_TClass], void>;
    protected _onPoolSetFail: pFlex.TFunc<[_TClass], void> = _ => this.target = _;

    get id() {
        return (this.constructor as typeof Shared_Pool)._key(this.hid);
    }

    protected __preload(): void {
        if(!this.isShared) {
            this._onPoolSetSuccess?.(this.target);
            this._onPreLoad?.();
            return;
        }

        switch(this.mode) {
            case _EMode.Set: {
                Shared_Pool._$pool.set(this.id, this.target, { state: this.state, onFail: this._onPoolSetFail, onSuccess: this._onPoolSetSuccess });
                break;
            }
            case _EMode.Get: {
                this.target = Shared_Pool._$pool.get(this.id, this._onPoolSetFail);
                break;
            }
        }

        this._onPreLoad?.();
    }
    protected _onPreLoad?(): void
}

export namespace Shared_Pool {
    export type EMode = _EMode
    export const EMode = _EMode
}

