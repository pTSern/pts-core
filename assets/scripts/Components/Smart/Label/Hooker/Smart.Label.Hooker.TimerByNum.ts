import { _decorator, Component } from 'cc';
import { Smart_Label_Hooker } from './Smart.Label.Hooker';
import { editor_property } from 'db://pts-core/scripts/utils/pClass';

const { ccclass, property } = _decorator;

@ccclass('Smart_Label_Hooker_TimerByNum')
export class Smart_Label_Hooker_TimerByNum extends Smart_Label_Hooker<number> {

    @editor_property()
    protected _value: number = 0;

    set(val: number): void {
        this._value = val;
    }

    protected _actLookUpBinder(...args: any[]): void {
    }
}
