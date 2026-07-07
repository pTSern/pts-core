export type CC_IEnumable<_TKey extends pFlex.TKey> = {
    __enums__: null;
} & Record<_TKey, any>;

export type CC_IEnumList<_TKey extends pFlex.TKey, _TValue extends pFlex.TKey> = { name: _TKey, value: _TValue }

export function CC_IEnumable<_TKey extends pFlex.TKey>(target: any | Record<_TKey, any>): target is CC_IEnumable<_TKey> {
    if(!target) return false;

    if(typeof target === 'object') {
        return '__enums__' in target
    }

    return false;
}

export function CC_IEnumList<_TKey extends pFlex.TKey, _TValue extends pFlex.TKey>(target: (any | Record<_TKey, _TValue>)[], deep: boolean = false): target is CC_IEnumList<_TKey, _TValue>[] {
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
