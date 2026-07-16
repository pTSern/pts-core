import { _decorator, Component, Node } from 'cc';
import { pConst } from '../../../utils';
import { UI_DualScroller_NavIcon } from './UI.DualScroller.NavIcon';

const { ccclass, property } = _decorator;

@ccclass('UI_DualScroller_NavIcons')
export class UI_DualScroller_NavIcons extends Component {

    @property({ type: [UI_DualScroller_NavIcon], group: pConst.GROUPS.CORE })
    icons: UI_DualScroller_NavIcon[] = []

    @property({ type: Node, group: pConst.GROUPS.EDITOR, visible: true })
    protected get __$quick_set() { return null }
    protected set __$quick_set(x: Node) {
        if(!x) return;
        this.icons = x.getComponentsInChildren(UI_DualScroller_NavIcon);
    }

    protected onLoad(): void {
        this.icons.forEach((_, i) => _.setIndex(i));
    }

    actForEach(func: pFlex.TFunc<[UI_DualScroller_NavIcon, number], void>) {
        if(!func) return;

        this.icons.forEach(func)
    }

    get length() { return this.icons.length }

    at(index: number) {
        return this.icons[index]
    }
}
