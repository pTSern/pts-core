import { PlacementInfo } from "cc";
import { pConst } from "../../utils";

export type CC_IEnumable<_TKey extends pFlex.TKey> = {
    __enums__: null;
} & Record<_TKey, any>;

export type CC_IEnumList<_TKey extends pFlex.TKey, _TValue = any> = { name: _TKey, value: _TValue }

function _is_CC_IEnumable<_TKey extends pFlex.TKey>(target: any | Record<_TKey, any>): target is CC_IEnumable<_TKey> {
    if(!target) return false;

    if(typeof target === 'object') {
        return '__enums__' in target
    }

    return false;
}

export const CC_IEnumable = Object.assign(_is_CC_IEnumable, {
    is: _is_CC_IEnumable,
    generator: function<_TKey extends pFlex.TKey>(target: Record<_TKey, any> | _TKey[]): CC_IEnumable<_TKey> {
        const _obj = { __enums__: null } as CC_IEnumable<_TKey>
        if(!target) return _obj;

        if(Array.isArray(target)) {
            //@ts-ignore
            target.forEach(_ => _obj[_] = _ )
        } else {
            target['__enums__'] = null;
            return target as CC_IEnumable<_TKey>
        }

        return _obj;
    }
})

function _is_CC_IEnumList<_TKey extends pFlex.TKey, _TValue extends pFlex.TKey>(target: (any | Record<_TKey, _TValue>)[], deep: boolean = false): target is CC_IEnumList<_TKey, _TValue>[] {
    if(!target) return false;
    if(!Array.isArray(target)) return false;

    if(deep) {
        return target.every(_ => ( 'name' in _ && 'value' in _ ))
    }

    const _target = target.find(Boolean)
    if(!_target) return false
    if(typeof _target !== 'object') return false 

    return ('name' in _target && 'value' in _target)
}

export const CC_IEnumList = Object.assign(_is_CC_IEnumList, {
    is: _is_CC_IEnumList,
    generator: function<_TKey extends pFlex.TKey, _TValue = _TKey>(target: Record<_TKey, any> | _TKey[], _out: pFlex.TFunc<[_TKey], _TValue> = pConst.ME_FUNC as unknown as pFlex.TFunc<[_TKey], _TValue>): CC_IEnumList<_TKey, _TValue>[] {
        let _arr: CC_IEnumList<_TKey, _TValue>[] = [];
        if(!target) return _arr;

        const _keys = Array.isArray(target) ? target : Object.keys(target);
        _arr = _keys.map((_: any) => ({ name: _, value: _out(_) }));

        return _arr;
    }

})

export function CC_EnumList<_T_UI_Id extends pFlex.TKey>(list: CC_IEnumList<_T_UI_Id, _T_UI_Id>[]  | CC_IEnumable<_T_UI_Id> | _T_UI_Id[], val: pFlex.TFunc<[_T_UI_Id], _T_UI_Id> = pConst.ME_FUNC) {
    let _list: CC_IEnumList<_T_UI_Id, _T_UI_Id>[] = []
    if(CC_IEnumable(list)) {
        for(const [k, v] of Object.entries(list)) {
            if(k === '__enums__') continue;
            _list.push({ name: k as _T_UI_Id, value: v })
        }
    } else if (CC_IEnumList(list)) {
        _list = list
    } else {
        for(const ret of list) {
            _list.push({ name: ret, value: val(ret) })
        }
    }
    return _list 
}
