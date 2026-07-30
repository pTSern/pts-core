//import { _decorator, Component, Label } from "cc";
//
//const { ccclass, property, requireComponent } = _decorator
//
//@ccclass("Smart_Label")
//@requireComponent(Label)
//export class Smart_Label extends Component {
//    @property({ type: Label })
//    protected _hooker: Label = null
//    @property({ type: Label })
//    get hooker() { this._ensure(); return this._hooker }
//    set hooker(x) { if(!x) { this._ensure(); return; } this._hooker = x }
//
//    protected _ensure() {
//        if(!this._hooker) {
//            this._hooker = this.getComponent(Label);
//        }
//    }
//}
