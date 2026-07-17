
export interface Event_IBinder {
    add(method: Function, binder: any, capture?: boolean): void
    remove(method: Function, binder: any): void
    has(method: Function, binder: any): boolean
}
