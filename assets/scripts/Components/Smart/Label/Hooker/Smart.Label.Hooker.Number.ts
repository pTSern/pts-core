import { _decorator } from "cc";
import { Smart_Label_Hooker } from "./Smart.Label.Hooker";
import * as pConst from "db://pts-core/scripts/utils/pConst";
import * as pString from "db://pts-core/scripts/utils/pString";
import { editor_property } from "db://pts-core/scripts/utils/pClass";

const { ccclass, property } = _decorator;
const CORE_GROUP = pConst?.GROUPS?.CORE || { name: 'Core', id: '9', displayOrder: 1000 };

@ccclass('Smart_Label_Hooker_Number')
export class Smart_Label_Hooker_Number extends Smart_Label_Hooker<number> {

    @property({ group: CORE_GROUP })
    isUseKMBFormat: boolean = true;

    @property({ group: CORE_GROUP })
    isUseDotFormat: boolean = false;

    @property({ group: CORE_GROUP, visible() { return this.isUseDotFormat } })
    dot: string = '.';

    @editor_property()
    protected _value: number = -1;
    set(val: number): void {
        if(this._value === val) return;
        this._value = val;
        this._label.string = `${this.prefix}${this.isUseKMBFormat ? pString.formatKMB(val) : this.isUseDotFormat ? pString.formatWithDots(val, this.dot) : val}${this.suffix}`;
    }
    get() { return this._value }

    protected _actLookUpBinder(...args: any[]): void {
        for(const _item of args) {
            if(typeof _item !== 'number') continue;
            this.set(_item);
            break;
        }
    }
}
