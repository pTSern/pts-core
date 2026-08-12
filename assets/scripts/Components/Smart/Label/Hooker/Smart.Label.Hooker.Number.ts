import { _decorator } from "cc";
import { Smart_Label_Hooker } from "./Smart.Label.Hooker";
import { pConst, pString } from "db://pts-core/scripts/utils";

const { ccclass, property } = _decorator

@ccclass('Smart_Label_Hooker_Number')
export class Smart_Label_Hooker_Number extends Smart_Label_Hooker<number> {

    @property({ group: pConst.GROUPS.CORE })
    isUseKMBFormat: boolean = true;

    set(val: number): void {
        this._label.string = `${this.prefix}${this.isUseKMBFormat ? pString.formatKMB(val) : val}${this.suffix}`;
    }

    protected _actLookUpBinder(...args: any[]): void {
        for(const _item of args) {
            if(typeof _item !== 'number') continue;
            this.set(_item);
            break;
        }
    }
}
