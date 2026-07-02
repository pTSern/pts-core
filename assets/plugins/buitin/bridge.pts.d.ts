
type _$TSafeType<T> = unknown extends T ? {} : T;
interface _$TInterfaces extends _$TSafeType<pTS.bridge._TData_Definded_By_Extensions>, _$TSafeType<pTS.bridge._TBundles_Definded_By_Extensions>, _$TSafeType<pTS.bridge._TType_Definded_By_User> {}

declare namespace pTS {
    type _$TReturn<T, IsAsync extends boolean> = IsAsync extends true ? Promise<T> : T;

    interface _I$<IsAsync extends boolean> {
        get(key: string): _$TReturn<any, IsAsync>
    }

    interface _$ICacheCommon<__TInterfaces_, IsAsync extends boolean> {
        set<_TKey extends keyof __TInterfaces_>(what: _TKey, value: __TInterfaces_[_TKey]): _$TReturn<void, IsAsync>
        get<_TKey extends keyof __TInterfaces_>(what: _TKey, creator?: pFlex.TFunc<[Map<string, any>, _TKey], __TInterfaces_[_TKey]>): _$TReturn<__TInterfaces_[_TKey], IsAsync>
    }

    interface _$ILinearCache<__TInterfaces_> extends _$ICacheCommon<__TInterfaces_, false> {}
    interface _$ISyncCache<__TInterfaces_> extends _$ICacheCommon<__TInterfaces_, true> {}

    type _$TEvents = 'set'

    interface _$IEventifyCommon<__ICache__ extends _$ICacheCommon<any, any>> {
        on<_TKey extends _$TEvents>(event: _TKey, func: pFlex.THandler<[...Parameters<__ICache__[_TKey]>], void>): void
        once<_TKey extends _$TEvents>(event: _TKey, func: pFlex.THandler<[...Parameters<__ICache__[_TKey]>], void>): void
        off<_TKey extends _$TEvents>(event: _TKey, func: pFlex.THandler<[...Parameters<__ICache__[_TKey]>], void>): void
    }

    interface _$IEventify<__ICache__ extends _$ILinearCache<any>> extends _$IEventifyCommon<__ICache__> {}
    interface _$ISEventify<__ICache__ extends _$ISyncCache<any>> extends _$IEventifyCommon<__ICache__> {}

    interface _$IAsynctify<__TInterfaces_> {
        set<_TKey extends keyof __TInterfaces_>(what: _TKey, value: __TInterfaces_[_TKey], map: Map<_TKey, __TInterfaces_[_TKey]>): any
        get<_TKey extends keyof __TInterfaces_>(what: _TKey, map: Map<_TKey, __TInterfaces_[_TKey]>): any
    }

    interface _$IOption<__TInterfaces_> {
        is_dict_mode?: boolean
        key_getter?: pFlex.TFunc<[keyof __TInterfaces_], string>
        is_eventify?: boolean
        asynctify?: _$IAsynctify<__TInterfaces_>
        is_ambiguous?: boolean
    }

    interface _$IBridge {
        //#1: Async + Eventify + Ambiguous
        replican<_IInterfaces = {}>(opt: { asynctify: _$IAsynctify<_IInterfaces>; is_eventify: true; is_ambiguous: true } & _$IOption<_IInterfaces>): _$ISyncCache<_IInterfaces> & _$ISEventify<_$ISyncCache<_IInterfaces>> & _I$<true>

        //#2: Async + Eventify
        replican<_IInterfaces = {}>(opt: { asynctify: _$IAsynctify<_IInterfaces>; is_eventify: true } & _$IOption<_IInterfaces>): _$ISyncCache<_IInterfaces> & _$ISEventify<_$ISyncCache<_IInterfaces>>

        //#3: Async + Ambiguous
        replican<_IInterfaces = {}>(opt: { asynctify: _$IAsynctify<_IInterfaces>; is_ambiguous: true } & _$IOption<_IInterfaces>): _$ISyncCache<_IInterfaces> & _I$<true>

        //#4: Async only
        replican<_IInterfaces = {}>(opt: { asynctify: _$IAsynctify<_IInterfaces> } & _$IOption<_IInterfaces>): _$ISyncCache<_IInterfaces>

        //#5: Linear + Eventify + Ambiguous
        replican<_IInterfaces = {}>(opt: { is_eventify: true; is_ambiguous: true } & _$IOption<_IInterfaces>): _$ILinearCache<_IInterfaces> & _$IEventify<_$ILinearCache<_IInterfaces>> & _I$<false>

        //#6: Linear + Eventify
        replican<_IInterfaces = {}>(opt: { is_eventify: true } & _$IOption<_IInterfaces>): _$ILinearCache<_IInterfaces> & _$IEventify<_$ILinearCache<_IInterfaces>>

        //#7: Linear + Ambiguous
        replican<_IInterfaces = {}>(opt: { is_ambiguous: true } & _$IOption<_IInterfaces>): _$ILinearCache<_IInterfaces> & _I$<false>

        //#8 8: Default
        replican<_IInterfaces = {}>(opt?: _$IOption<_IInterfaces>): _$ILinearCache<_IInterfaces>
    }

    export const bridge: _$IBridge & _$ILinearCache<_$TInterfaces> & _$IEventify<_$ILinearCache<_$TInterfaces>> & _I$<false>

    export namespace bridge {
        export type ILinearCache<__TInterfaces_> = _$ILinearCache<__TInterfaces_>;
        export type ISyncCache<__TInterfaces_> = _$ISyncCache<__TInterfaces_>
    }

}
