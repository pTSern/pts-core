import { _decorator, Node } from 'cc';
import { Helper_Selector_Base } from './Helper.Selector.Base';

const { ccclass } = _decorator;

@ccclass('Helper_Selector_Nodes')
export class Helper_Selector_Nodes extends Helper_Selector_Base<Node> {
    protected _$ctor = Node;

    protected _key(obj: Node): string {
        return obj.name;
    }

}
