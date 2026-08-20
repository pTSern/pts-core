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

@ccclass('Shared_Pool')
export abstract class Shared_Pool<_TClass> extends Component {
    private static _$pool = new Dictionary_Persistent<string, any>()
    private static _$waiters = js.createMap(true);
    protected static _prefix: string = "";

    private static _key(_key: string | Helper_IdSelector) {
        return this._prefix + (_key instanceof Helper_IdSelector ? _key.sid : _key);
    }

    static take<_TObject>(key: string | Helper_IdSelector) {
        key = this._key(key);
        return this._$pool.get(key) as _TObject;
    }

    static await<_TObject>(key: string | Helper_IdSelector): Promise<_TObject> {
        key = this._key(key);

        let _out = Shared_Pool._$waiters[key];
        if(!_out) {
            _out = Shared_Pool._$waiters[key] = new Promise<_TObject>(_rs => {
                const _ret = Shared_Pool._$pool.get(key, _ => _rs(_));
                _ret && _rs(_ret as _TObject);
            })
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

