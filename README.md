# `pts-core` - Foundation Framework & Core Runtime

> **Author**: pTSern  
> **Version**: `1.0.0`  
> **Cocos Creator Compatibility**: `>= 3.8.0`  
> **Category**: Core Infrastructure & Runtime Framework

---

## 1. Overview

`pts-core` is the central dependency and architectural foundation for the entire **pTS** ecosystem within Cocos Creator. It provides core base classes (such as `pTSAsset` for ScriptableObject workflows), high-performance decoupled event dispatching (`pDriver` and `pEngine.Json`), reactive data watchers, smart UI component systems, robust object pooling, utility libraries, and the editor's scene execution bridge (`src/_cc.js`).

All sibling extensions (`pts-asset`, `pts-action`, `pts-box2d`, `pts-finite-state`, `pts-language`, `pts-bundle-list`, etc.) build directly upon `pts-core`.

---

## 2. Process Architecture & Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cocos Creator Main Process                   │
│   (Extension Lifecycle, Menus, IPC Routing, Package Config)     │
└────────────────┬───────────────────────────────┬────────────────┘
                 │                               │
                 ▼                               ▼
┌─────────────────────────────────┐   ┌───────────────────────────┐
│       Scene Process Bridge      │   │     AssetDB Contribution   │
│          (`src/_cc.js`)         │   │   Mounted to `db://assets`│
│  - get_all_pts_inheritance_chains│   │   - Read-only mount       │
│  - find_node_by_uuid            │   │   - Shared runtime scripts│
│  - get_component_by_uuid        │   │   - Precompiled plugins   │
└────────────────┬────────────────┘   └─────────────┬─────────────┘
                 │                                  │
                 └───────────────┬──────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Game / Scene Execution Context               │
│                                                                 │
│  ┌────────────────────┐ ┌───────────────────┐ ┌───────────────┐ │
│  │     pTSAsset       │ │   Event Driver    │ │  Pooler Core  │ │
│  │ (ScriptableObject) │ │ (pDriver/Listeners│ │ (Node/Object) │ │
│  └────────────────────┘ └───────────────────┘ └───────────────┘ │
│  ┌────────────────────┐ ┌───────────────────┐ ┌───────────────┐ │
│  │  Reactive Watchers │ │     Smart UI      │ │    Utils      │ │
│  │  (Data Bindings)   │ │  (DualScroller,..)│ │ (pEngine,...) │ │
│  └────────────────────┘ └───────────────────┘ └───────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Key Contributions in `package.json`:
* **`asset-db.mount`**: Mounts `./assets` to the project's Asset Database (`readonly: true`). Exposes all core scripts, UI components, watchers, and plugins to game code without manual copying.
* **`scene.script`**: Registers `./src/_cc.js` as the scene bridge script. This executes inside the Cocos Creator Engine runtime context where `cc` and `cce` are globally present, enabling reflection queries from the main process.

---

## 3. Core Subsystems & Runtime APIs

### 3.1. `pTSAsset` Base Class (`assets/scripts/pTSAsset.ts`)
The foundational class for data-driven ScriptableObjects in Cocos Creator:
* Extends `cc.Asset` to integrate natively with Cocos Creator's asset serialization pipeline.
* **Type Identification**: Every subclass maintains a distinct type metadata identifier (`__type__`), used by the editor's drag-and-drop validation system and Inspector reflection.
* **Deep Cloning**: Provides an automated `.clone()` pipeline using `pObject.clone()` that duplicates nested structures, maps, arrays, and primitive values while properly re-binding IDs.
* **Dirty Flagging & Serialization**: Supports runtime mutation tracking and hydration from raw JSON payloads.

```typescript
import { _decorator } from 'cc';
import { pTSAsset } from 'db://pts-core/scripts/pTSAsset';

const { ccclass, property } = _decorator;

@ccclass('PlayerConfig')
export class PlayerConfig extends pTSAsset {
    @property({ tooltip: 'Base maximum health' })
    public maxHealth: number = 100;

    @property({ tooltip: 'Base movement speed' })
    public moveSpeed: number = 250;
}
```

---

### 3.2. Event Bus & Driver Engine (`pDriver`, `pEngine.Json`)
A decoupled, high-performance publish-subscribe architecture powering system communication without hard component coupling.

* **`pDriver` (`assets/scripts/utils/pDriver.ts`)**:
  * Lightweight handler and dispatcher supporting prioritized execution, one-shot subscriptions (`once`), and clean unsubscribe callbacks.
* **`pEngine.Json` (`assets/scripts/utils/pEngine.ts`)**:
  * Strongly-typed event and parameter routing schema.
  * Links sender nodes, payload dictionaries, and receiver handlers across independent UI and gameplay modules.
* **Event Components (`assets/scripts/Components/Event/`)**:
  * `Event.Driver`: Component wrapper attaching driver listeners to node lifecycles (`onEnable`/`onDisable`).
  * `Event.Listener` & `Event.Observer`: Declarative inspector-configured event hooks.
  * `Event.Bridge`: Binds external DOM, window, or webview events directly into Cocos Creator's event loop.

---

### 3.3. Reactive Watcher Suite (`assets/scripts/editor/Watcher/`)
Components providing reactive data-binding between underlying state values and UI / gameplay components:

* `Watcher.Property`: Monitors arbitrary object properties and triggers registered handlers when values change.
* `Watcher.Primitive`, `Watcher.Boolean`, `Watcher.Number`: Primitive-optimized watchers with threshold and diffing logic.
* `Watcher.Node`: Listens to scene hierarchy mutations (active state, parent reordering, position alterations).
* `Watcher.Component`: Detects component enablement, addition, or destruction.
* `Watcher.pTSAsset`: Observes properties inside loaded ScriptableObject assets and updates attached UI views dynamically.

---

### 3.4. Smart Component System (`assets/scripts/Components/Smart/`)
Ready-to-use behaviors that eliminate repetitive boilerplate:

* `Smart.Button`: Enhanced button component supporting debounce timers, auto-disable states, tweened press animations, and sound effects.
* `Smart.Label`: Dynamic text formatter supporting running number animations (`Hooker.RunningNumber`), countdown timers (`Hooker.CountDown`), and localized numeric formatting.
* `Smart.ProgressBar`: Smooth interpolation of progress bar values with easing curves and threshold triggers.
* `Smart.PersistentNode`: Automates `game.addPersistRootNode` lifecycle management across scene transitions.
* `Smart.ResizeToCanvas`: Dynamically resizes UI elements to match active canvas design resolution and safe-area boundaries.
* `UI.DualScroller` (`assets/scripts/Components/UI/DualScroller/`):
  * Modular multi-page scroller system with synchronized navigation bars (`NavBar`), icons (`NavIcon`), and active indicators (`NavIndicator`).
  * Supports auto-hiding pages (`AutoHidePage`), snap points, and smooth drag mechanics.

---

### 3.5. High-Performance Object Pooling (`assets/scripts/pooler/`)
* **`Pooler.Core`**: Generic TypeScript object pool supporting pre-warming, max capacity bounds, allocation callbacks, and reset hooks.
* **`Pooler.Node`**: Specialized node pool for `cc.Node` and `cc.Prefab` instances. Eliminates garbage collection spikes during bullet hell, particle spawning, or large list view scrolling.
* **`Shared.Pool`**: Globally accessible static pooling registry for cross-system instance sharing.

---

### 3.6. Utility Library Suite (`assets/scripts/utils/`)

| Module | Core Functions / Capabilities |
|---|---|
| **`pArray`** | Array slicing, chunking (`chunks`), min/max extractors, shuffling (`shuffle`), unique deduplication, nearest value search (`findSmallerNearest`). |
| **`pAsync`** | Dynamic barrier (`DynamicBarrier`), promise resolvers (`DynamicResolver`), cancellation tokens (`Task`), pooled promises (`Pool`), mutex locks (`Mutex`), delay/countdown routines. |
| **`pClass`** | Reflection utilities: `getAllCCClasses()`, `getClassName()`, `isInheritedFrom()`, `getInheritedClasses()`, contract checking (`isComponentOfContract`), runtime component queries (`getComponent`, `getComponentsInChildren`). |
| **`pConst`** | Global engine constants, editor preview flags (`IS_EDITOR`, `IS_TEST`), empty function stubs (`VOID_FUNC`), vector constants. |
| **`pEngine`** | Cross-platform abstractions: device detection (`Device`), node hierarchy traversals (`NodeUtils`), component query wrappers (`CompUtils`). |
| **`pGlobal`** | Global logging system (`Logger.group`, `warn`, `error`), clipboard bridge (`addToClipboard`), asset download trigger (`download`). |
| **`pMath`** | Direction-to-Euler conversion (`convertDirToEuler`), quadratic Bezier calculations (`getQuadraticBezier`), bounded scaling (`scaleImageInsideBound`), clock formatters (`toClock`), pseudo-random generators (`rand`, `rands`). |
| **`pObject`** | Deep cloning (`clone`), property copying (`assign`, `copy`), chain binding (`actChainBinder`), method introspection (`getAllMethodNames`), method interception (`hook`). |
| **`pString`** | String interpolation, UUID generator (`uuid`), number abbreviations (`formatKMB`, 1.2M / 4.5K), comma/dot formatters, regex extraction. |

---

## 4. Scene Process Bridge (`src/_cc.js`)

`pts-core` contributes a scene script executed inside the Cocos Creator Engine runtime context via:
```javascript
Editor.Message.request('scene', 'execute-scene-script', {
    name: 'pts-core',
    method: '<method_name>',
    args: [...]
});
```

### Available Bridge Methods:

#### `get_all_pts_inheritance_chains`
* **Purpose**: Gathers the complete class inheritance hierarchy of all registered `@ccclass` definitions deriving from `pTSAsset` or other specified base classes.
* **Used by**: `pts-asset` to validate drag-and-drop operations, asset picker filtering, and custom inspector rendering.
* **Returns**:
  ```json
  {
    "HeroConfig": ["PlayerConfig", "pTSAsset", "Asset"],
    "EnemyConfig": ["CharacterConfig", "pTSAsset", "Asset"]
  }
  ```

#### `find_node_by_uuid(uuid)`
* **Purpose**: Traverses the live scene graph and active prefab root to return the node matching the given UUID.

#### `get_component_by_uuid(uuid)`
* **Purpose**: Locates a specific component instance across active scene nodes by component UUID.

---

## 5. Built-in Plugins & Global Definitions

Located under `assets/plugins/buitin/`:
* **`$.pts.js` / `$.pts.d.ts`**: Injects the global `$` namespace containing global helper shortcuts, debug hooks, and runtime configurations.
* **`bridge.pts.js` / `bridge.pts.d.ts`**: Global bridge definitions for web platform interoperability.
* **`physics_2d/b2.js`**: Box2D WASM/JS physics runtime bindings utilized by `pts-box2d`.

---

## 6. Directory Structure

```
pts-core/
├── assets/                          # Mounted as db://assets/ (read-only)
│   ├── plugins/
│   │   ├── buitin/                  # Global $ runtime scripts & typings
│   │   └── physics_2d/              # Box2D core JS runtime
│   └── scripts/
│       ├── Components/              # Smart, Event, Handler, UI components
│       ├── data/                    # Storage and state manager
│       ├── editor/Watcher/          # Reactive property watchers
│       ├── helper/                  # Tween, color, spawner, selector helpers
│       ├── interfaces/              # Common contracts (Event, CC, Object)
│       ├── pooler/                  # Node & object pooling engines
│       ├── pTSAsset/                # pTSAsset data & event bindings
│       ├── pTSAsset.ts              # Core ScriptableObject base class
│       └── utils/                   # pArray, pAsync, pClass, pDriver, pEngine...
├── bootstrap.js                     # Extension entry point
├── package.json                     # Cocos Creator extension manifest
├── src/
│   ├── _cc.js                       # Scene process reflection bridge
│   └── _doc.js                      # JSDoc type definitions for editor bridge
└── tsconfig.json
```
