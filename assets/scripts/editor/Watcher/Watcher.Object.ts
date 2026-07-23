
import { editor_ccclass, editor_property } from "db://pts-core/scripts/utils/pClass";
import { Watcher_Property } from "./Watcher.Property"

@editor_ccclass("Watcher_Object")
export class Watcher_Object extends Watcher_Property<object>{

    public static creator: (_target: any, _out?: Watcher_Property<any>[]) => Watcher_Property<any>[] = null;

    protected _value = null;
    @editor_property([Watcher_Property])
    protected _values: Watcher_Property<any>[] = []

    init(name: string, value: object): void {
        this.name = name;
        if (Watcher_Object.creator) {
            this._values = Watcher_Object.creator(value);
        }
    }

}
