import { _decorator, Node, Vec3, v3, Tween } from "cc";
import { Helper_Action } from "./Helper.Action";
import { Enums_EByTo } from "../Enums/Enums.TweenOption";
import { pConst, pEngine } from "../../utils";

const { ccclass, property } = _decorator;

interface _Helper_IVec3 extends Helper_Action {
    objTarget: Node
    vecTarget: Vec3
    isWorld: boolean
}

@ccclass("Helper_Vec3")
export class Helper_Vec3 extends Helper_Action implements _Helper_IVec3 {
    static create(opt: Partial<_Helper_IVec3>) {
        const _ret = new Helper_Vec3();
        _ret.easing = opt.easing || 'smooth';
        _ret.duration = opt.duration || 0;
        _ret.byto = opt.byto || Enums_EByTo.By;

        _ret.objTarget = opt.objTarget || null;
        _ret.vecTarget = opt.vecTarget || v3();
        _ret.isWorld = opt.isWorld || false;

        return _ret;
    }

    @property({ type: Node, displayOrder: 0, group: pConst.GROUPS.CORE })
    objTarget: Node = null;

    @property({ displayOrder: 0, visible() { return !this.objTarget }, group: pConst.GROUPS.CORE })
    vecTarget: Vec3 = v3()

    @property({ group: pConst.GROUPS.CORE })
    isWorld: boolean = false;

    @property({ group: pConst.GROUPS.CORE })
    get lineEditorZone() { return pConst.LINE }
    @property({ type: Node, group: pConst.GROUPS.CORE, tooltip: "This only workd on Editor mode" })
    get nodeTarget(): Node { return null }
    set nodeTarget(x) {
        if(!x) return;

        this.vecTarget = this.isWorld ? x.worldPosition.clone() : x.position.clone();
    }

    getAsPosition(isWorld: false, root: Node): Vec3
    getAsPosition(isWorld: true): Vec3
    getAsPosition(isWorld: boolean, root?: Node) {
        if(isWorld || !root) return this.objTarget ? this.objTarget.worldPosition : this.vecTarget
        else {
            if(this.objTarget) {
                return (this.objTarget.uuid === root.uuid) ? this.objTarget.worldPosition : pEngine.NodeUtils.getLocalPosition(root, this.objTarget)
            } else {
                return this.vecTarget;
            }

        }
    }

    get() {
        return this.objTarget ? this.objTarget.worldPosition : this.vecTarget
    }

    tween<_TTarget extends Object>(tween: Tween<_TTarget>, key: pFlex.TKeyOf<_TTarget>, prop: pFlex.TFunc<[Helper_Vec3], Vec3>, overrideDuration?: number) {
        const _prop = prop(this);
        const dur = (typeof overrideDuration === 'number' && overrideDuration >= 0) ? overrideDuration : this.duration;
        //@ts-ignore
        return tween[this.byto](dur, { [key]: _prop }, { easing: this.easing })
    }
}
