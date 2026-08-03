
import { _decorator, Node, Vec3, v3, Tween, TweenEasing } from "cc";
import { pConst } from "../../utils";
import { Enums_EByTo, Enums_EEasing } from "../Enums/Enums.TweenOption";

const { ccclass, property } = _decorator;

@ccclass("Helper_Action")
export class Helper_Action {
    @property({ type: Enums_EEasing, displayOrder: 1, group: pConst.GROUPS.CORE })
    easing: TweenEasing = "smooth";

    @property({ type: Enums_EByTo, displayOrder: 1, group: pConst.GROUPS.CORE })
    byto: Enums_EByTo = Enums_EByTo.To;

    @property({ min: 0, displayOrder: 1, group: pConst.GROUPS.CORE })
    duration: number = 0;

}
