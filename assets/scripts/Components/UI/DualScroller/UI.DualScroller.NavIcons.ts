import { _decorator, Component, Node } from 'cc';
import { pConst } from '../../../utils';

const { ccclass, property } = _decorator;

@ccclass('UI_DualScroller_NavIcons')
export class UI_DualScroller_NavIcons extends Component {
    @property({ type: [Node], group: pConst.GROUPS.CORE })
    icons: Node[] = []

    actForEach(func: pFlex.TFunc<[Node, number], void>) {
        if(!func) return;

        this.icons.forEach(func)
    }

    get length() { return this.icons.length }

    at(index: number) {
        return this.icons[index]
    }
}
