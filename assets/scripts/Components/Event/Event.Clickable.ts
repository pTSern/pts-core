import { __private, _decorator, Button, Component } from "cc";
import { implement, pTSAsset } from "../../utils";

const { ccclass } = _decorator

@ccclass('Event_Clickable')
export abstract class Event_Clickable {
    abstract onClick(btn: Button): any
}

@implement(Event_Clickable)
@ccclass('Event_ClickableAsset')
export abstract class Event_ClickableAsset extends pTSAsset implements Event_Clickable {
    abstract onClick(btn: Button): any
}

@implement(Event_Clickable)
@ccclass('Event_ClickableComp')
export abstract class Event_ClickableComp extends Component implements Event_Clickable {
    abstract onClick(btn: Button): any
}
