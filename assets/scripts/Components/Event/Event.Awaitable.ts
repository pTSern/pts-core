import { _decorator, Component } from "cc";

const { ccclass } = _decorator

@ccclass('Event_Awaitable')
export abstract class Event_Awaitable extends Component {
    abstract wait(): Promise<any>
    static execute(list: Event_Awaitable[]): Promise<any> {
        return Promise.all(list.map(_e => _e.wait()))
    }
}
