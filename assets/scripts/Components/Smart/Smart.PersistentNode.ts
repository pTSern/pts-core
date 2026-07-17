import { _decorator, Component, director } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('Smart_PersistentNode')
export class Smart_PersistentNode extends Component {
    protected __preload(): void {
        director.addPersistRootNode(this.node);
    }
}
