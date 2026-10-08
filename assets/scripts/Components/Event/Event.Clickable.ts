import { __private, _decorator, Asset, Button, Component } from "cc";
import { implement, pTSAsset } from "../../utils";
import { Handler } from "../../utils/pDriver";

const { ccclass } = _decorator

@ccclass('Event_Clickable')
export abstract class Event_Clickable extends pTSAsset {
    abstract onClick(btn: Button): void;
}

@implement(Event_Clickable)
@ccclass('Test_Clickable')
export class Test_Clickable extends pTSAsset implements Event_Clickable {
    onClick(btn: Button): void {
    }
}

