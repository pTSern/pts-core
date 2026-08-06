
import { _decorator, Tween } from "cc";
import { Helper_Action } from "./Helper.Action";
import { pConst } from "../../utils";

const { ccclass, property } = _decorator;

@ccclass("Helper_Value")
export class Helper_Value extends Helper_Action {

    @property({ displayOrder: 0, visible() { return !this.objTarget }, group: pConst.GROUPS.CORE })
    target: number = 0;

    get() {
        return this.target
    }

    tween<_TTarget extends Object>(tween: Tween<_TTarget>, key: pFlex.TKeyOf<_TTarget>, overrideDuration?: number) {
        const dur = (typeof overrideDuration === 'number' && overrideDuration >= 0) ? overrideDuration : this.duration;
        //@ts-ignore
        return tween[this.byto](dur, { [key]: this.target }, { easing: this.easing })
    }
}
