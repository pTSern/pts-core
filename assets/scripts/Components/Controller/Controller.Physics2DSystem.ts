

import { _decorator, Component, EPhysics2DDrawFlags, PhysicsSystem2D, Vec2 } from "cc";

const { ccclass, property } = _decorator;

@ccclass("Controller_Physiscs2DSystem")
export class Controller_Physiscs2DSystem extends Component {
    @property({ tooltip: "Show collider shapes in 2D physics debug draw." })
    public showCollider: boolean = false;

    @property({ tooltip: "Show 2D physics collider AABB boxes in debug draw." })
    public showPhysicColliderBox: boolean = false;

    @property({ tooltip: "Global gravity used by PhysicsSystem2D and custom falling states." })
    public gravity: Vec2 = new Vec2(0, -980);

    protected onLoad(): void {
        this.applySettings();
    }

    protected start(): void {
        this.applySettings();
    }

    protected onEnable(): void {
        this.applySettings();
    }

    protected update(): void {
        this.applySettings();
    }

    public refresh(): void {
        this.applySettings();
    }

    protected applySettings(): void {
        if (!PhysicsSystem2D.instance) {
            return;
        }

        PhysicsSystem2D.instance.gravity = new Vec2(this.gravity.x, this.gravity.y);

        let flags = EPhysics2DDrawFlags.None;
        if (this.showCollider) {
            flags |= EPhysics2DDrawFlags.Shape;
        }

        if (this.showPhysicColliderBox) {
            flags |= EPhysics2DDrawFlags.Aabb;
        }

        PhysicsSystem2D.instance.debugDrawFlags = flags;
    }
}
