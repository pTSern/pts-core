import { _decorator, CCString, Component, js } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('Smart_LifeCycleCheck')
export class Smart_LifeCycleCheck extends Component {
    @property({ type: [CCString] })
    msg: string[] = [js.IDGenerator.global.getNewId()];

    @property({ type: CCString })
    list: string[] = ["__NONE_LOADED__"]

    protected onLoad(): void {
        console.log('[Smart_LifeCycleCheck] Log >> { onLoad } >>', ...this.msg);
        this.list.push("onLoad")
    }
    protected onEnable(): void {
        console.log('[Smart_LifeCycleCheck] Log >> { onEnable } >>', ...this.msg);
        this.list.push("onEnable")
    }
    protected start(): void {
        console.log('[Smart_LifeCycleCheck] Log >> { start } >>', ...this.msg);
        this.list.push("start")
    }
    protected onDisable(): void {
        console.log('[Smart_LifeCycleCheck] Log >> { onDisable } >>', ...this.msg);
        this.list.push('onDisable')

    }
    protected onDestroy(): void {
        console.log('[Smart_LifeCycleCheck] Log >> { onDestroy } >>', ...this.msg);
        this.list.push('onDestroy')
    }
}
