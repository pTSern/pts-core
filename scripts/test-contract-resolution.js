const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Run the real runtime module with only its Cocos/platform boundary replaced.
const registry = new Map();
const nativeHasInstance = Function.prototype[Symbol.hasInstance];
class Component {}
class Node {
    constructor(...components) {
        this.components = components;
        for (const component of components) component.node = this;
    }
    getComponent(type) {
        const ctor = typeof type === 'string' ? registry.get(type) : type;
        return typeof ctor === 'function'
            ? this.components.find(component => nativeHasInstance.call(ctor, component)) || null
            : null;
    }
}
const js = {
    createMap: () => Object.create(null),
    getClassByName: name => registry.get(name),
    getClassName: value => typeof value === 'function' ? value.name : value.constructor.name,
    isChildClassOf: (child, parent) => child === parent || nativeHasInstance.call(parent, child.prototype),
};
const implKey = Symbol.for('__pTS_implements__');
const dependencies = {
    cc: { js, Node, Component, _decorator: {} },
    'cc/env': { DEV: false, EDITOR: false, EDITOR_NOT_IN_PREVIEW: false },
    './pArray': { flatter: (...items) => items.flat(Infinity) },
    './pConst': { KEYS: { SINGLETON: { IMPL: implKey } } },
    '../interfaces/cc/CC.IEnumable': {
        CC_IEnumable: { generator: values => Object.fromEntries(values.map(value => [value, value])) },
        CC_IEnumList: { generator: values => values },
    },
};
const filename = path.join(__dirname, '../assets/scripts/utils/pClass.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2019, module: ts.ModuleKind.CommonJS },
}).outputText;
const moduleExports = {};
const context = vm.createContext({
    exports: moduleExports, console, Set, Map, WeakMap, Symbol,
    require(name) {
        if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
        return dependencies[name];
    },
});
vm.runInContext(compiled, context, { filename, timeout: 2000 });
context.api = moduleExports;
context.Component = Component;
context.Node = Node;
context.registry = registry;
context.implKey = implKey;
context.assert = assert;

// The timeout also bounds the old resolver's swallowed stack-overflow recursion.
vm.runInContext(`
api.setImplementCheckEnabled(false);
class Explosive {}
class Breakable {}
class Collectable {}
class Bomb extends Component {}
class Stone extends Component {}
class DerivedStone extends Stone {}
for (const type of [Explosive, Breakable, Collectable, Bomb, Stone, DerivedStone]) {
    registry.set(type.name, type);
}
api.implement(Explosive)(Bomb);
api.implement(Collectable, Breakable)(Stone);
const stone = new Stone();
const bomb = new Bomb();
const node = new Node(new Component(), stone, bomb);

let explosiveChecks = 0;
const explosiveHasInstance = Explosive[Symbol.hasInstance];
Object.defineProperty(Explosive, Symbol.hasInstance, {
    configurable: true,
    value(value) {
        explosiveChecks++;
        return explosiveHasInstance.call(this, value);
    },
});
assert.equal(api.getComponent(new Node(new Component(), stone), Explosive), null,
    'a breakable stone must not resolve as an explosive');
assert.ok(explosiveChecks < 32, 'negative contract lookup must not recursively exhaust the stack');
assert.equal(api.getComponent(node, Breakable), stone);
assert.equal(api.getComponent(node, 'Explosive'), bomb);
assert.equal(api.isComponentOfContract(stone, Breakable), true);
assert.equal(api.isComponentOfContract(stone, Explosive), false);
assert.equal(stone instanceof Breakable, true);
assert.equal(stone instanceof Explosive, false);
assert.equal(api.isImplementedFrom(Breakable, DerivedStone), true,
    'subclasses must retain inherited contract implementations');
assert.equal(api.isImplementedFrom(Stone, DerivedStone), true);
assert.equal(api.isImplementedFrom(Breakable, Breakable), true);

class CycleA {}
class CycleB {}
class Missing {}
class CycleOwner extends Component {}
CycleA[implKey] = new Set([CycleB]);
CycleB[implKey] = new Set([CycleA]);
CycleOwner[implKey] = new Set([CycleA]);
api.hookHasInstance(CycleA);
api.hookHasInstance(CycleB);
assert.equal(api.isImplementedFrom(Missing, CycleOwner), false,
    'cyclic contract metadata must terminate for a missing contract');
assert.equal(api.isImplementedFrom(CycleB, CycleOwner), true);

class Left {}
class Right {}
class Leaf {}
class DiamondOwner extends Component {}
Left[implKey] = new Set([Leaf]);
Right[implKey] = [Leaf, Breakable];
DiamondOwner[implKey] = new Set([Left, Right]);
assert.equal(api.isImplementedFrom(Breakable, DiamondOwner), true,
    'a shared diamond branch must not hide a later matching contract');
assert.equal(api.isImplementedFrom(Missing, DiamondOwner), false);

class ContractParent {}
class ContractChild extends ContractParent {}
class InheritedOwner extends Component {}
InheritedOwner[implKey] = new Set([ContractChild]);
api.hookHasInstance(ContractParent);
assert.equal(api.isImplementedFrom(ContractParent, InheritedOwner), true,
    'implemented contracts must retain their native base classes');

class NamedA {}
class NamedB {}
class NamedCycleOwner extends Component {}
registry.set('NamedA', NamedA);
registry.set('NamedB', NamedB);
NamedA.__pTS_implements__ = { NamedB: true };
NamedB.__pTS_implements__ = { NamedA: true };
NamedCycleOwner.__pTS_implements__ = { NamedA: true };
assert.equal(api.isImplementedFrom(Missing, NamedCycleOwner), false);
NamedB.__pTS_implements__.Breakable = true;
assert.equal(api.isImplementedFrom(Breakable, NamedCycleOwner), true,
    'a cycle must not hide another registered contract branch');

class NamedOwner extends Component {}
NamedOwner.__pTS_implements__ = { Explosive: true };
assert.equal(api.isImplementedFrom(Explosive, NamedOwner), true);
assert.equal(api.isImplementedFrom('UnregisteredContract', NamedOwner), false);
NamedOwner.__pTS_implements__ = ['UnregisteredContract'];
assert.equal(api.isImplementedFrom('UnregisteredContract', NamedOwner), true,
    'name-only metadata must work even before its class is registered');
assert.equal(api.isImplementedFrom(null, Stone), false);
assert.equal(api.isImplementedFrom(Breakable, null), false);
`, context, { filename: 'contract-resolution-regressions', timeout: 2000 });

console.log('pTS contract-resolution regressions passed.');
