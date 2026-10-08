import { __private, _decorator, Button, CCObject } from "cc";
import { implement, pTSAsset } from "../../utils";

const { ccclass } = _decorator

@ccclass('Event_Clickable')
export abstract class Event_Clickable extends CCObject {
    abstract onClick(btn: Button): void;
}

@implement(Event_Clickable)
@ccclass('Test_Clickable')
export class Test_Clickable extends pTSAsset implements Event_Clickable {
    onClick(btn: Button): void {
    }
}

