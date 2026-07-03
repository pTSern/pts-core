export type CC_IEnumable<_TKey extends pFlex.TKey> = {
    __enums__: null;
} & Record<_TKey, any>;

export type CC_IEnumList<_TKey extends pFlex.TKey, _TValue extends pFlex.TKey> = { key: _TKey, value: _TValue }[]
