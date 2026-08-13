
import { _decorator } from "cc";
import { editor_ccclass, editor_property } from "../utils/pClass";
import { pArray, pGlobal } from "../utils";

interface _IPoolData<_TClass, _TArgs = any[]> {
    ctor: pFlex.TFunc<_TArgs, _TClass>
    numPerBatch: number;
    numShrinkThreshold?: number;
    dtor?: pFlex.TFunc<[_TClass], void>
}

@editor_ccclass("Pooler_Core")
export class Pooler_Core<_TClass, _TArgs = any[]> {

    @editor_property()
    protected declare _batch: number;

    @editor_property()
    protected declare _shrinker: number;

    @editor_property()
    protected declare _index: number;

    @editor_property(undefined, { multiline: true })
    protected get __ctor_() { return String(this._ctor) }
    @editor_property(undefined, { multiline: true })
    protected get __dtor_() { return String(this._dtor) }

    protected declare _ctor: pFlex.TFunc<_TArgs, _TClass>
    protected declare _dtor: pFlex.TFunc<[_TClass], void>

    protected _pool: _TClass[] = [];

    static create<_TClass, _TArgs = any[]>(_ref: _IPoolData<_TClass, _TArgs>, ...args: _TArgs[]) {
        const _this = new Pooler_Core<_TClass, _TArgs>();
        _this._init(_ref, ...args);
        return _this
    }

    protected _init(_ref: _IPoolData<_TClass, _TArgs>, ...args: _TArgs[]) {
        this._ctor = _ref.ctor;
        this._dtor = _ref.dtor || null;
        this._batch = Math.max(_ref.numPerBatch, 1);
        this._shrinker = _ref.numShrinkThreshold ? Math.max(_ref.numShrinkThreshold, 1) : this._batch;
        this._index = this._batch - 1;

        for (let i = 0; i < this._batch; ++i) {
            this._pool.push(_ref.ctor(...args));
        }
    }

    public alloc(...args: _TArgs[]): _TClass {
        if (this._index < 0) {
            this._pool.length = this._batch;
            for (let i = 0; i < this._batch; i++) {
                this._pool[i] = this._ctor(...args);
            }
            this._index = this._batch - 1;
        }

        return this._pool[this._index--];
    }

    public free (obj: pFlex.TArray<_TClass>, ...objs: _TClass[]): void {
        objs = pArray.flatter(obj, ...objs);

        this._pool.length = this._index + 1;
        Array.prototype.push.apply(this._pool, objs);
        this._index += objs.length;
    }

    public shrink (): void {
        const _freeObjectNumber = this._index + 1;
        if (_freeObjectNumber <= this._shrinker) {
            return;
        }

        let _objectNumberToShrink = 0;
        if (_freeObjectNumber >> 1 >= this._shrinker) {
            _objectNumberToShrink = _freeObjectNumber >> 1;
        } else {
            _objectNumberToShrink = Math.floor((_freeObjectNumber - this._shrinker + 1) / 2);
        }

        if (this._dtor) {
            for (let i = this._index - _objectNumberToShrink + 1;  i <=  this._index; ++i) {
                this._dtor(this._pool[i]);
            }
        }
        this._index -= _objectNumberToShrink;
        this._pool.length = this._index + 1;
    }

    public destroy (): void {
        const _dtor = arguments.length > 0 ? arguments[0] : null;
        if (_dtor) {
            pGlobal.warn('ALL', "Pool.destroy no longer take a function as parameter, Please specify destruct function in the construction of Pool instead");
            return;
        }
        const readDtor = _dtor || this._dtor;
        if (readDtor) {
            for (let i = 0; i <= this._index; i++) {
                readDtor(this._pool[i]);
            }
        }
        this._pool.length = 0;
        this._index = -1;
    }
}
