

import { _decorator, Component } from 'cc';
import { Helper_IdSelector } from '../../helper/Helper.IdSelector';

const { ccclass, property, executionOrder } = _decorator;

@ccclass('Smart_Limiter')
@executionOrder(-9999)
export class Smart_Limiter extends Component {
    private static _$pool = new Set<string>()

    @property({ type: Helper_IdSelector })
    id: Helper_IdSelector = new Helper_IdSelector();

    protected __preload(): void {
        const id = this.id.sid;

        if(!Smart_Limiter._$pool.has(id)) {
            Smart_Limiter._$pool.add(id)
            return;
        }

        this.node.destroy();
    }
}
