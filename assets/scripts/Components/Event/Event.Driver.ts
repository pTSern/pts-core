import { _decorator, CCClass, js } from "cc";
import { pClass, pConst, pDriver } from "db://pts-core/scripts/utils";
import { CC_IEnumList } from "../../interfaces/cc/CC.IEnumable";
import { BUILD } from "cc/env";
import { Event_Flexer } from "./Event.Flexer";
import { Shared_Pool } from "../Shared/Shared.Pool";

const { property, ccclass } = _decorator

const _$ = pDriver.Handler.create();

@ccclass("Event_Driver._Helper")
class _Helper<_TKey extends pFlex.TKey> {
    @property({ type: pConst.ENUM })
    key: _TKey = "" as _TKey

    @property({ type: Event_Flexer })
    flex: Event_Flexer = new Event_Flexer()

    focus(focus: CC_IEnumList<_TKey, _TKey>[]) {
        CCClass.Attr.setClassAttr(this, 'key', 'type', 'Enum');
        CCClass.Attr.setClassAttr(this, 'key', 'enumList', focus);
    }

    emit(...args: any[]) {
        return this.flex.emit(...args);
    }
}

@ccclass("Event_Driver")
export class Event_Driver<_TInterfaces extends Record<string, any>> extends Shared_Pool<pDriver.Handler<any>> implements pDriver.IDriver<_TInterfaces> {
    protected static _$bounces: readonly pFlex.TKey[] | pFlex.TKey[]
    protected static _$class: pFlex.TCtor<_Helper<keyof _$TInterfaces>> = _Helper
    protected static _prefix: string = "Event_Driver_";

    @property({ type: _Helper })
    protected _helpers: _Helper<keyof _TInterfaces>[] = []

    @property({ type: _Helper, group: pConst.GROUPS.EVENT })
    get helpers() { return this._helpers }
    set helpers(value: _Helper<keyof _TInterfaces>[]) {
        const _ctor = this.constructor['_$class'] as pFlex.TCtor<_Helper<keyof _TInterfaces>>;

        if(pClass.isInheritedFrom(Event_Driver._$class, _ctor)) {
            CCClass.Attr.setClassAttr(this, '_helpers', 'ctor', _ctor);
            CCClass.Attr.setClassAttr(this, 'helpers', 'ctor', _ctor);

            const _name = js.getClassName(_ctor);
            this._helpers.length = value.length;
            for(let _i = 0; _i < value.length; _i++) {
                const _this = js.getClassName(this._helpers[_i]);
                if(_this === _name) {
                    continue;
                }

                this._helpers[_i] = new _ctor();
            }
        }

        this.onFocusInEditor();
    }

    @property({ group: pConst.GROUPS.OPTION })
    isDriverFist: boolean = true;
    @property({ group: pConst.GROUPS.OPTION })
    isReturnJsonResponse: boolean = false;

    target: pDriver.Handler<any> = null
    private _$key: (_key: keyof _TInterfaces) => pFlex.TKey = pConst.THROWER
    private _$map: Record<pFlex.TKey, _Helper<any>> = js.createMap(true);

    private _$container = {
        get(container: Record<any, _Helper<any>>, key: pFlex.TKey, ...args: any[]) {
            args;
            return container[String(key)]
        },
        key(helper: _Helper<any>): string {
            return helper.key;
        }
    }

    onFocusInEditor() { this.__focus() }
    resetInEditor(): void { this.__focus() }

    protected __focus() {
        const _list = this.constructor['_$bounces'] as (keyof _TInterfaces)[];
        if(!_list) return;

        const _enums = CC_IEnumList.generator(_list);
        this.helpers.forEach(_ => _.focus(_enums));
    }

    protected _transfomer?(): typeof this._$container

    /**
     * NOTE: MUST CALL `super` on overriding
     */
    protected __preload(): void {
        if(this._transfomer) {
            this._$container = this._transfomer();
        }

        this.helpers.forEach(_ => this._$map[this._$container.key(_)] = _);
        BUILD && delete this.helpers;
        [this.target, this._$key] = this.isShared ? [_$, _ => `${this.uuid}_${String(_)}`] : [pDriver.Handler.create(), _ => _]
        super.__preload();
    }

    set<_TKey extends keyof _TInterfaces>(event: _TKey, ...listeners: pFlex.THandler<Parameters<_TInterfaces[_TKey]>, void>[]): void {
        return this.target.set(this._$key(event), ...listeners)
    }

    wait<_TKey extends keyof _TInterfaces>(key: _TKey): Promise<void> {
        return this.target.wait(this._$key(key));
    }

    public emit<_TKey extends keyof _TInterfaces>(key: _TKey, ...args: Parameters<_TInterfaces[_TKey]>): any[] {
        const _d = () => this.target.emit(this._$key(key), ...args);
        const _j = () => {
            const _helper = this._$container.get(this._$map as any, key, ...args);
            return _helper?.emit(...args) || [];
        } 

        const [_first, _second] = this.isDriverFist ? [_d, _j] : [_j, _d];
        const _r1 = _first(), _r2 = _second();

        if(!this.isReturnJsonResponse) return this.isDriverFist ? _r1 : _r2;
        return [..._r1, ..._r2];
    }

    on<_TKey extends keyof _TInterfaces>(key: _TKey, ...funcs: pFlex.THandler<Parameters<_TInterfaces[_TKey]>, void>[]): void {
        return this.target.on(this._$key(key), ...funcs);
    }

    once<_TKey extends keyof _TInterfaces>(key: _TKey, ...funcs: pFlex.THandler<Parameters<_TInterfaces[_TKey]>, void>[]): void {
        return this.target.once(this._$key(key), ...funcs);
    }

    off<_TKey extends keyof _TInterfaces>(key: _TKey, ...funcs: pFlex.THandler<Parameters<_TInterfaces[_TKey]>, void>[]): void {
        return this.target.off(this._$key(key), ...funcs);
    }

    clear(key: keyof _TInterfaces): void {
        return this.target.clear(this._$key(key))
    }

}

export namespace Event_Driver {
    export const Helper = _Helper
    export type Helper<_TKey extends pFlex.TKey> = _Helper<_TKey>
}
