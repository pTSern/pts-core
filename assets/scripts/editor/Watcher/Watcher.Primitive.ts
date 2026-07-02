import { editor_ccclass, editor_property } from "db://pts-core/scripts/utils/pClass";
import { Watcher_Property } from "./Watcher.Property"

@editor_ccclass("Watcher_String")
export class Watcher_String extends Watcher_Property<string>{

    @editor_property()
    protected _value = "";

}
