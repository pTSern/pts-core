import { _decorator, CCString, Component, js } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('Smart_LifeCycleCheck')
export class Smart_LifeCycleCheck extends Component {
    @property({ type: [CCString] })
    msg: string[] = [js.IDGenerator.global.getNewId()];

    protected onLoad(): void {
        console.log('[Smart_LifeCycleCheck] Log >> { onLoad } >>', ...this.msg);
    }
    protected onEnable(): void {
        console.log('[Smart_LifeCycleCheck] Log >> { onEnable } >>', ...this.msg);
    }
    protected start(): void {
        console.log('[Smart_LifeCycleCheck] Log >> { start } >>', ...this.msg);
    }
    protected onDisable(): void {
        console.log('[Smart_LifeCycleCheck] Log >> { onDisable } >>', ...this.msg);
    }
    protected onDestroy(): void {
        console.log('[Smart_LifeCycleCheck] Log >> { onDestroy } >>', ...this.msg);
    }
}
