
import * as cc from "cc";
import * as pClass from './pClass'

type _TEntity = number;
type _TSignature = number; // 32-bit bitmask where each bit represents a component type

@pClass.editor_ccclass("pTS_ECS_Queue")
class _Queue {
    @cc._decorator.property({ type: cc.CCInteger, min: 1 })
    max: number = 5000;

    @pClass.editor_property(cc.CCInteger)
    private _entities: _TEntity[] = [];

    @pClass.editor_property()
    private _count: number = 0;

    private _signatures: Uint32Array;

    constructor(max?: number) {
        this.max = max || this.max;
        this._signatures = new Uint32Array(this.max);

        for (let entity: _TEntity = 0; entity < this.max; ++entity) {
            this._entities.push(entity);
        }
    }

    call<_TKey extends Exclude<pFlex.TKeyOf<_Queue, Function, false>, 'call'>>(method: _TKey, ...params: Parameters<_Queue[_TKey]>): ReturnType<_Queue[_TKey]> {
        const _fn = this[method];
        return _fn.apply(this, params)
    }

    /**
     * Allocates an unused entity ID from the queue.
     */
    public 'entity.create'(): _TEntity {
        if (this._count >= this.max) {
            throw new Error("Too many entities in existence.");
        }

        // Take an ID from the front of the queue
        const id = this._entities.shift()!;
        this._count++;

        return id;
    }

    /**
     * Resets an entity's signature and recycles its ID.
     */
    public 'entity.destroy'(entity: _TEntity): void {
        if (entity < 0 || entity >= this.max) {
            throw new RangeError("Entity out of range.");
        }

        // Invalidate the destroyed entity's signature (equivalent to bitset.reset())
        this._signatures[entity] = 0;

        // Put the destroyed ID at the back of the queue
        this._entities.push(entity);
        this._count--;
    }

    /**
     * Sets the component bitmask signature for an entity.
     */
    public 'signature.set'(entity: _TEntity, signature: _TSignature): void {
        if (entity < 0 || entity >= this.max) {
            throw new RangeError("Entity out of range.");
        }

        this._signatures[entity] = signature;
    }

    /**
     * Gets the component bitmask signature for an entity.
     */
    public 'signature.get'(entity: _TEntity): _TSignature {
        if (entity < 0 || entity >= this.max) {
            throw new RangeError("Entity out of range.");
        }

        return this._signatures[entity];
    }

    public get 'entity.count'(): number {
        return this._count;
    }
}

@pClass.editor_ccclass("pTS_ECS_Component")
class _Component<_TComp> {
    protected _entities: _TComp[] = []
    protected _E2I: Map<_TEntity, number> = new Map<_TEntity, number>();
    protected _I2E: Map<number, _TEntity> = new Map<number, _TEntity>();
    protected _size: number = 0;

    insert(entity: _TEntity, data: _TComp): void {
        if(this._E2I.has(entity)) {
            throw new Error(`Entity ${entity} already has a component.`);
        }

        const _index = this._size;
        this._E2I.set(entity, _index);
        this._I2E.set(_index, entity);
        this._entities[_index] = data;
        this._size++;
    }

    remove(entity: _TEntity): void {
        if(!this._E2I.has(entity)) {
            throw new Error(`Entity ${entity} does not have a component.`);
        }

        const _index = this._E2I.get(entity)!;
        const _lindex = this._size - 1;
        this._entities[_index] = this._entities[_lindex];

        const _lentity = this._I2E.get(_lindex)!;
        this._E2I.set(_lentity, _index);
        this._I2E.set(_index, _lentity);

        this._E2I.delete(entity);
        this._I2E.delete(_lindex);
        this._size--;
    }

    get(entity: _TEntity): _TComp | undefined {
        if(!this._E2I.has(entity)) {
            return undefined;
        }
        return this._entities[this._E2I.get(entity)!];
    }

    destroy(entity: _TEntity): void {
        if(this._E2I.has(entity)) {
            this.remove(entity);
        }
    }

}

export type _TComponentType = number;

@pClass.editor_ccclass("pTS_ECS_ComponentManager")
export class _ComponentManager {
    private _types: Map<pFlex.TCtor<any>, _TComponentType> = new Map();
    private _components: Map<pFlex.TCtor<any>, _Component<any>> = new Map();
    private _TNext: _TComponentType = 0;

    /**
     * Registers a component class with the manager before it is used.
     */
    public register<T>(_class: pFlex.TCtor<any, T>): void {
        if (this._types.has(_class)) {
            throw new Error(`Registering component type '${_class.name}' more than once.`);
        }

        this._types.set(_class, this._TNext);
        this._components.set(_class, new _Component<T>());
        this._TNext++;
    }

    /**
     * Retrieves the numeric type ID assigned to a component class.
     */
    public type<T>(_class: pFlex.TCtor<any, T>): _TComponentType {
        const type = this._types.get(_class);
        if (type === undefined) {
            throw new Error(`Component '${_class.name}' not registered before use.`);
        }
        return type;
    }

    /**
     * Adds a component instance to an entity.
     */
    public add<T>(entity: _TEntity, _class: pFlex.TCtor<any, T>, component: T): void {
        this.array(_class).insert(entity, component);
    }

    /**
     * Removes a component from an entity.
     */
    public remove<T>(entity: _TEntity, _class: pFlex.TCtor<any, T>): void {
        this.array(_class).remove(entity);
    }

    /**
     * Retrieves an entity's component instance.
     */
    public get<T>(entity: _TEntity, _class: pFlex.TCtor<any, T>): T {
        const component = this.array(_class).get(entity);
        if (component === undefined) {
            throw new Error(`Entity ${entity} does not have component '${_class.name}'.`);
        }
        return component;
    }

    /**
     * Cleans up all component records across all stores when an entity is destroyed.
     */
    public destroy(entity: _TEntity): void {
        for (const componentArray of this._components.values()) {
            componentArray.destroy(entity);
        }
    }

    /**
     * Helper method to retrieve and cast the component storage array.
     */
    private array<T>(_class: pFlex.TCtor<any, T>): _Component<T> {
        const array = this._components.get(_class);
        if (!array) {
            throw new Error(`Component '${_class.name}' not registered before use.`);
        }
        return array as _Component<T>;
    }
}

@pClass.editor_ccclass("pTS_ECS_System")
export abstract class _System {
    entities: Set<_TEntity> = new Set<_TEntity>();
}

export type _TSystemCtor<T extends _System> = pFlex.TCtor<any, T>

@pClass.editor_ccclass("pTS_ECS_SystemManager")
export class _SystemManager {
    private _signatures: Map<_TSystemCtor<any>, _TSignature> = new Map();
    private _systems: Map<_TSystemCtor<any>, _System> = new Map();

    /**
     * Registers a system type, creates an instance of it, and returns the instance.
     */
    public 'system.register'<T extends _System>(systemClass: _TSystemCtor<T>): T {
          if (this._systems.has(systemClass)) {
              throw new Error(`Registering system '${systemClass.name}' more than once.`);
          }

          const system = new systemClass();
          this._systems.set(systemClass, system);
          return system;
    }

    /**
     * Defines the component signature required for an entity to belong to this system.
     */
    public 'signature.destroy'<T extends _System>(systemClass: _TSystemCtor<T>, signature: _TSignature): void {
        if (!this._systems.has(systemClass)) {
            throw new Error(`System '${systemClass.name}' used before registered.`);
        }

        this._signatures.set(systemClass, signature);
    }

    /**
     * Alias for signature.destroy to set required signature for a system.
     */
    public 'signature.set'<T extends _System>(systemClass: _TSystemCtor<T>, signature: _TSignature): void {
        this['signature.destroy'](systemClass, signature);
    }

    /**
     * Removes a destroyed entity from every registered system's tracking set.
     */
    public 'entity.destroy'(entity: _TEntity): void {
        for (const system of this._systems.values()) {
            system.entities.delete(entity);
        }
    }

    /**
     * Updates system membership whenever an entity's component signature changes.
     */
    public 'entity.signature.change'(entity: _TEntity, entitySignature: _TSignature): void {
        for (const [systemClass, system] of this._systems.entries()) {
            const systemSignature = this._signatures.get(systemClass) ?? 0;

            // Entity has all required component bits if (entitySignature & systemSignature) === systemSignature
            if ((entitySignature & systemSignature) === systemSignature && systemSignature !== 0) {
                system.entities.add(entity);
            } else {
                system.entities.delete(entity);
            }
        }
    }

    /**
     * Retrieves an already registered system instance.
     */
    public 'system.get'<T extends _System>(systemClass: _TSystemCtor<T>): T {
        const system = this._systems.get(systemClass);
        if (!system) {
            throw new Error(`System '${systemClass.name}' not registered.`);
        }
        return system as T;
    }

    call<_TKey extends Exclude<pFlex.TKeyOf<_SystemManager, Function, false>, 'call'>>(method: _TKey, ...params: Parameters<_SystemManager[_TKey]>): ReturnType<_SystemManager[_TKey]> {
        const _fn = this[method];
        return _fn.apply(this, params)
    }
}

export namespace pECS {
    export const Queue = _Queue;
    export type Entity = _TEntity;
    export type Signature = _TSignature;
    export type Queue = _Queue;

    export const Component = _Component;
    export type Component<_TComp> = _Component<_TComp>;

    export const ComponentManager = _ComponentManager;
    export type ComponentManager = _ComponentManager;

    export const System = _System;
    export type System = _System;

    export const SystemManager = _SystemManager;
    export type SystemManager = _SystemManager;
}
