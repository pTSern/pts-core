import { _decorator, Component } from "cc";
import { pConst, pDriver } from "db://pts-core/scripts/utils";

const { property, ccclass } = _decorator

const _$ = pDriver.Handler.create();

@ccclass("Event_Driver")
export class Event_Driver<_TInterfaces extends Record<string, any>> extends Component implements pDriver.IDriver<_TInterfaces> {
    @property({ group: pConst.GROUPS.CORE })
    isShared: boolean = true;

    protected _event: pDriver.Handler<any> = null
    private _$key: (_key: keyof _TInterfaces) => pFlex.TKey = pConst.THROWER

    /**
     * NOTE: MUST CALL `super` on overriding
     */
    protected __preload(): void {
        [this._event, this._$key] = this.isShared ? [_$, _ => _] : [pDriver.Handler.create(), _ => `${this.zid}_${String(_)}`]
    }

    set<_TKey extends keyof _TInterfaces>(event: _TKey, ...listeners: pFlex.THandler<Parameters<_TInterfaces[_TKey]>, void>[]): void {
        return this._event.set(this._$key(event), ...listeners)
    }

    wait<_TKey extends keyof _TInterfaces>(key: _TKey): Promise<void> {
        return this._event.wait(this._$key(key));
    }

    public emit<_TKey extends keyof _TInterfaces>(key: _TKey, ...args: Parameters<_TInterfaces[_TKey]>): any[] {
        return this._event.emit(this._$key(key), ...args)
    }

    on<_TKey extends keyof _TInterfaces>(key: _TKey, ...funcs: pFlex.THandler<Parameters<_TInterfaces[_TKey]>, void>[]): void {
        return this._event.on(this._$key(key), ...funcs);
    }

    once<_TKey extends keyof _TInterfaces>(key: _TKey, ...funcs: pFlex.THandler<Parameters<_TInterfaces[_TKey]>, void>[]): void {
        return this._event.once(this._$key(key), ...funcs);
    }

    off<_TKey extends keyof _TInterfaces>(key: _TKey, ...funcs: pFlex.THandler<Parameters<_TInterfaces[_TKey]>, void>[]): void {
        return this._event.off(this._$key(key), ...funcs);
    }

    clear(key: keyof _TInterfaces): void {
        return this._event.clear(this._$key(key))
    }

}
