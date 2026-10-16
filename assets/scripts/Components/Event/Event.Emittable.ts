
import { _decorator } from "cc";

const { ccclass } = _decorator

@ccclass('Event_Emittable')
export abstract class Event_Emittable {
    abstract emit(...args: any[]): any
}
