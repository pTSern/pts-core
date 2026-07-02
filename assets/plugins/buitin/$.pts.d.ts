
declare namespace pTS {
    export namespace $ {
        interface _IListener<__TInterfaces_ extends Record<string, any>> {
            on<_TKey extends keyof __TInterfaces_>(key: _TKey, ...funcs: pFlex.THandler<Parameters<__TInterfaces_[_TKey]>, void>[]): void;
            once<_TKey extends keyof __TInterfaces_>(key: _TKey, ...funcs: pFlex.THandler<Parameters<__TInterfaces_[_TKey]>, void>[]): void;
            off<_TKey extends keyof __TInterfaces_>(key: _TKey, ...funcs: pFlex.THandler<Parameters<__TInterfaces_[_TKey]>, void>[]): void;
            clear(key: keyof __TInterfaces_): void;
        }

        export interface IDriver<__TInterfaces_ extends Record<string, any>> extends _IListener<__TInterfaces_> {
            emit: _IEventify<__TInterfaces_>;
        }

        interface _IEventify<__TInterfaces_ extends Record<string, any>> {
            <__TKey extends keyof __TInterfaces_>(key: __TKey, ...params: Parameters<__TInterfaces_[__TKey]>): any[];
        }

        interface _IEventifyHelper<__TInterfaces_ extends Record<string, any>> {
            <_TTarget extends object, _TAssign extends boolean = true, _TProto extends boolean = false>(
                _$target: _TTarget, 
                is_asign_emitter?: _TAssign, 
                is_prototype_mode?: _TProto
            ): _TProto extends true 
                ? _TTarget & (_TAssign extends false ? _IListener<__TInterfaces_> : IDriver<__TInterfaces_>)
                : _IEventify<__TInterfaces_>;
        }
        // Direct class decorator signature: @pTS.$.eventify
        export function eventify<TFunction extends Function>(target: TFunction): TFunction;
        // Decorator factory signature: @pTS.$.eventify(true, true)
        export function eventify(is_asign_emitter?: boolean, is_prototype_mode?: boolean): <TFunction extends Function>(target: TFunction) => TFunction;
        //#1. Curried overload: allows pTS.$.eventify<FIRST>()(b)
        export function eventify<__TInterfaces_ extends Record<string, any>>(): _IEventifyHelper<__TInterfaces_>;
        //#2. Overload with no generic type arguments (pure inference of Target): allows pTS.$.eventify(b)
        export function eventify<_TTarget extends object, _TAssign extends boolean = true, _TProto extends boolean = false>(
            _$target: _TTarget, 
            is_asign_emitter?: _TAssign,
            is_prototype_mode?: _TProto
        ): _TProto extends true 
            ? _TTarget & (_TAssign extends false ? _IListener<Record<string, any>> : IDriver<Record<string, any>>)
            : _IEventify<Record<string, any>>;
        //#3. Non-curried overload with explicit target: allows pTS.$.eventify<FIRST, Node>(b)
        export function eventify<__TInterfaces_ extends Record<string, any>, _TTarget extends object, _TAssign extends boolean = true, _TProto extends boolean = false>(
            _$target: _TTarget, 
            is_asign_emitter?: _TAssign,
            is_prototype_mode?: _TProto
        ): _TProto extends true 
            ? _TTarget & (_TAssign extends false ? _IListener<__TInterfaces_> : IDriver<__TInterfaces_>)
            : _IEventify<__TInterfaces_>;

        export function cache(): {};
    }
}
