
import { editor_ccclass, editor_property } from "db://pts-core/scripts/utils/pClass";
import { Watcher_Property } from "./Watcher.Property"
import { bridge } from './Watcher._Bridge'

@editor_ccclass("Watcher_Object")
export class Watcher_Object extends Watcher_Property<object>{

    protected _value = null;
    @editor_property([Watcher_Property])
    protected _values: Watcher_Property<any>[] = []

    init(name: string, value: object): void {
        this.name = name;
        this._values = bridge.create(value)
    }

}
