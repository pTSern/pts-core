import { _decorator, CCClass, CCInteger, Component, Node, Enum, js, v3, Vec3 } from 'cc';
import { Helper_Param_Base } from './Helper.Param.Base';
import { pClass, pConst } from '../../utils';
import { Editor_Smart_SelfFocus } from '../../editor/Smart/Editor.Smart.SelfFocus';
import { CC_EnumList } from '../../interfaces/cc/CC.IEnumable';

const { ccclass, property } = _decorator;

@ccclass("Y")
class Y {
    @property({ type: Vec3 })
    v: Vec3 = null
    @property({  })
    z: Vec3 = v3()

    @property({ type: CCInteger })
    int: number = 10

    @property({  })
    str: string = 'mess'
}

@ccclass("X")
class X {
    @property({ type: Component })
    comp: Component = null

    @property({ type: Node })
    xnod: Node = null

    @property(Y)
    y: Y = new Y()
}

@ccclass('Helper_Param_Creator')
export class Helper_Param_Creator extends Editor_Smart_SelfFocus {
    @property({ type: [Helper_Param_Base], group: pConst.GROUPS.CORE, readonly: { deep: false } })
    params: Helper_Param_Base[] = []

    @property({  })
    protected _filter: pClass.EList = 'cc.Component';

    @property({ type: pClass.EList })
    get filter() { return this._filter }
    set filter(x) {
        this._filter = x;
        this.focus();
    }

    @property({  })
    protected _type: string = ''
    @property({ type: Enum({}) })
    get type() { return this._type }
    set type(x) {
        this._type = x;
        this.focus();
    }

    @property({  })
    data: any = null

    @property({ type: Component })
    comp: Component = null

    @property({ type: X })
    x: X = new X()

    focus(): void {
        console.log(">>> THAU", CCClass.Attr.getClassAttrs(Helper_Param_Creator));
        const _list = pClass.getAllCCClasses(this._filter);
        const _cce = CC_EnumList(Array.from(_list));
        CCClass.Attr.setClassAttr(this, 'type', 'enumList', _cce);

        const _class = js.getClassByName(this._type);
        if(!_class) return

        CCClass.Attr.setClassAttr(this, 'data', 'type', 'Object')
        CCClass.Attr.setClassAttr(this, 'data', 'ctor', _class)
        CCClass.Attr.setClassAttr(this, 'data', 'default', () => new _class())
    }
}
