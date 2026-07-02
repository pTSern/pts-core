
import { editor_ccclass, editor_property } from "db://pts-core/scripts/utils/pClass";
import { Watcher_Property } from "./Watcher.Property"

@editor_ccclass("Watcher_Boolean")
export class Watcher_Boolean extends Watcher_Property<boolean>{

    @editor_property()
    protected _value = false;

}
