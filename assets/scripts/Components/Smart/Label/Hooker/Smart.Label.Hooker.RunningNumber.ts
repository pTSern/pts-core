import { _decorator, JsonAsset, Label, math, tween, Tween } from 'cc';
import { Type_EasingSelector } from '../../../Type/Type.Easing';
import { pConst, pEngine, pString, pClass } from 'db://pts-core/scripts/utils';
import { Smart_Label_Hooker } from './Smart.Label.Hooker';

const { ccclass, property, requireComponent } = _decorator;
const { editor_property } = pClass

@ccclass('Smart_Label_Hooker_RunningNumber')
@requireComponent(Label)
export class Smart_Label_Hooker_RunningNumber extends Smart_Label_Hooker<number> {

    @property({ group: pConst.GROUPS.CORE })
    isUseKMBFormat: boolean = true;

    @property({ min: 0, group: pConst.GROUPS.CORE })
    duration: number = 0.5;

    @property({ group: pConst.GROUPS.CORE })
    easing: Type_EasingSelector = new Type_EasingSelector();

    @property({ type: JsonAsset, group: pConst.GROUPS.EVENT })
    listener: JsonAsset = null;

    @editor_property()
    protected _value: number = 0;

    get value() { return this._value; }
    set value(value: number) {
        this._value = value;
        this._label.string = `${this.prefix}${this.isUseKMBFormat ? pString.formatKMB(this._value) : this._value}${this.suffix}`;
    }

    protected _tween: Tween<Smart_Label_Hooker_RunningNumber> = null;
    protected _onPreLoad(): void {
        if(this.listener) {
            pEngine.Json.add(this.listener, { func: this._actLookUpBinder, binder: this });
        }
    }

    protected _actLookUpBinder(...args: any[]) {
        for(const _item of args) {
            if(typeof _item !== 'number') continue;
            this.set(_item);
            break;
        }
    }

    set(val: number) {
        if(this._value === val) return;

        this._tween?.stop();
        this.duration <= 0 ? this.value = val : (this._tween = tween<Smart_Label_Hooker_RunningNumber>(this).to(this.duration, { value: val }, { easing: this.easing.get, onUpdate(target, ratio) {
            target.value = math.lerp(target._value, val, ratio)
        }, }).start());
    }
}
