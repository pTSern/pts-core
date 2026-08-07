import { js } from "cc";
import { pClass } from "../../utils";

interface _IMap<_TValue> {
    value: _TValue;
    state: number;
}

type _ISetOpt<_TValue> = {
    state: number
    onSuccess?: pFlex.TFunc<[_TValue], void>
    onFail?: pFlex.TFunc<[number], void>

} | number

interface _IWaiter<_TValue> {
    once: boolean
    waiter: pFlex.TFunc<[_TValue], void>
}

type _IGetOpt<_TValue> = {
    once?: boolean
    waiter: pFlex.TFunc<[_TValue], void>
} | pFlex.TFunc<[_TValue], void>


const { editor_ccclass } = pClass

@editor_ccclass('$_Dictionary_Persistent')
export class Dictionary_Persistent<_TKey extends pFlex.TKey, _TValue> {
    protected _$map: Record<_TKey, _IMap<_TValue>> = js.createMap(true);
    protected _$waiters: Record<_TKey, _IWaiter<_TValue>[]> = js.createMap(true);

    set(key: _TKey, value: _TValue, state: _ISetOpt<_TValue> = 0) {
        const _is = typeof state === 'number';
        const _state = _is ? state : state.state;
        const _cur = this._$map[key];

        if (_cur) {
            if (_cur.state < _state) {
                if (!_is) state.onFail?.(_cur.state);
                return;
            }
            _cur.value = value;
            _cur.state = _state;
        } else {
            this._$map[key] = { value, state: _state };
        }

        const _waiters = this._$waiters[key];
        if (_waiters) {
            let _writeIdx = 0;
            for (let i = 0; i < _waiters.length; i++) {
                const _w = _waiters[i];
                _w.waiter(value);
                if (!_w.once) {
                    _waiters[_writeIdx++] = _w;
                }
            }
            _waiters.length = _writeIdx;
            if (!_writeIdx) delete this._$waiters[key];
        }

        if (!_is) state.onSuccess?.(value);
    }

    get(key: _TKey, opt?: _IGetOpt<_TValue>): _TValue | undefined {
        const _cur = this._$map[key];
        if (_cur) return _cur.value;

        if (opt) {
            const _isFn = typeof opt === 'function';
            (this._$waiters[key] ??= []).push({
                once: _isFn ? true : (opt.once ?? true),
                waiter: _isFn ? opt : opt.waiter
            });
        }

        return undefined;
    }

    array(): _TValue[] {
        const _arr: _TValue[] = [];
        for(const _key in this._$map) {
            const _cur = this._$map[_key];
            if (_cur) _arr.push(_cur.value);
        }
        return _arr;
    }

    each(callback: pFlex.TFunc<[_TKey, _TValue], void>, nullable?: boolean) {
        for(const _key in this._$map) {
            const _cur = this._$map[_key];
            nullable || _cur ? callback(_key, _cur.value) : null;
        }

    }
}
