
import { _decorator, Component } from 'cc';
import { Handler_Selector } from './Handler.Selector';

const { ccclass, property } = _decorator;

@ccclass('Handler_Component')
export class Handler_Component extends Component {
    @property({ type: Handler_Selector })
    selector: Handler_Selector = new Handler_Selector();
}
