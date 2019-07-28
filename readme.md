# Red-Black tree
This library provides advanced implementation of Red-black tree, which is a kind of self-balancing binary search tree for JavaScript.

Source code is written in TypeScript and should run both in Node.js and browsers (although, you will not be able to use disk-based implementation).

### Why this project was created
Implementations of Red-black tree that were out there when this project was created had following drawbacks:
* most were not written in strict typescript
* not focused on performance or memory efficiency
* do not allow custom implementation for storing nodes

This library aims to be the most complete and advanced implementation of Red-black tree available for JavaScript ecosystem.

### Available features
Implementation provides following basic features one might expect from binary search tree:
* node addition (key and value)
* node deletion (value using key)
* node lookup using key (returns key and value of the closest solution available)
* focus on high performance and memory efficiency

Those features share the same mechanics of Red-black tree, but have different implementations on top.
Implementations consist of nodes that hold key, value and internal Red-black tree properties (color and children) and node managers that can manipulate those nodes in order to provide basic features above and more.

Node managers and nodes are separate entities, which means you can select one of existing flavors from this library or use interfaces provided and make your own implementation from scratch.

Node managers plug in into tree implementation. There are 2 kinds of trees available: regular synchronous `Tree` and asynchronous `TreeAsync`.
Asynchronous tree is currently only supported in combination with Disk-based node manager, which means you can have multi-terabytes trees on disk working with this implementation despite only having a small fraction of physical RAM.

#### Node managers: JavaScript
Supports any data type supported by JavaScript as key and value, there are 3 flavors available in this library that support following key types:
* number
* string
* Uint8Array

Others can be easily written by extending `NodeManagerJs` class.

Advantages: fast and flexible
Disadvantages: not very memory efficient, all nodes are kept in memory as objects all the time

#### Node managers: Binary Memory
Supports only Uint8Array both for keys and values. The whole tree is allocated in RAM as single continuous array of bytes.

Advantages: very high memory efficiency, especially on large number of keys (node objects are created only when working with tree and are cleaned up right after use)
Disadvantages: requires specifying max number of nodes upfront, about 5x slower for keys insertion and about 3.5x slower retrieval comparing to JavaScript node manager

#### Node managers: Binary Disk
Supports only Uint8Array both for keys and values. The whole tree is only stored on disk, which allows to work with trees that are many times larger than amount of available RAM.

Advantages: supports large trees that don't fit into RAM (node objects are created only when working with tree and are cleaned up right after use)
Disadvantages: requires specifying max number of nodes upfront, orders of magnitude slower than Binary Memory node manager (depending on disk performance)

### How to install
```bash
npm install @subspace/red-black-tree
```

### How to use
You need 2 things: node manager and tree itself (note that different node managers are constructed in a different way).

```typescript
// Synchronous JavaScript node manager
import {NodeManagerJsString, Tree} from "@subspace/red-black-tree";

const nodeManager = new NodeManagerJsString<string>();
const tree = new Tree(nodeManager);
tree.addNode('string key1', 'string value');
console.log(tree.getClosestNode('string key1'));
tree.removeNode('string key1');
```

```typescript
// Asynchronous JavaScript node manager
import {NodeManagerBinaryDisk, TreeAsync} from "@subspace/red-black-tree";

const nodeManager = await NodeManagerBinaryDisk.create('/path/to/file.bin', 300, 2, 1);
const tree = new TreeAsync(nodeManager);
await tree.addNode(Uint8Array.of(0, 1), Uint8Array.of(1));
console.log(await tree.getClosestNode(Uint8Array.of(0, 1)));
await tree.removeNode(Uint8Array.of(0, 1));
await nodeManager.close();
```

### API: For out of the box use

#### redBlackTree.Tree<K, V>(nodeManager: INodeManager<K, V>)
Constructor, creates a new tree, `K` and `V` are key and value data types accordingly.

#### redBlackTree.Tree.addNode(key: K, value: V): void
Add a new node to the tree.

#### redBlackTree.Tree.removeNode(key: K): void
Remove node from the tree.

#### redBlackTree.Tree.getNodeValue(targetKey: K): V | null
Get the node value by target key, `null` if key if not found.

#### redBlackTree.Tree.getClosestNode(targetKey: K): [K, V] | null
Get closest node key/value to `targetKey` (can be exact match or not, please check if needed) or `null` if not found.

#### redBlackTree.TreeAsync<K, V>(nodeManager: INodeManagerAsync<K, V>)
The same as in regular `Tree`, but for asynchronous node managers.

#### redBlackTree.TreeAsync.addNode(key: K, value: V): Promise<void>
The same as in regular `Tree`, but for asynchronous node managers.

#### redBlackTree.TreeAsync.removeNode(key: K): Promise<void>
The same as in regular `Tree`, but for asynchronous node managers.

#### redBlackTree.Tree.getNodeValue(targetKey: K): Promise<V | null>
The same as in regular `Tree`, but for asynchronous node managers.

#### redBlackTree.TreeAsync.getClosestNode(targetKey: K): Promise<[K, V] | null>
The same as in regular `Tree`, but for asynchronous node managers.

#### redBlackTree.NodeManagerJsNumber<V>()
Constructor, creates JavaScript node manager with numbers as keys. There are no public methods you would need to use in most cases.

#### redBlackTree.NodeManagerJsString<V>()
Constructor, creates JavaScript node manager with strings as keys. There are no public methods you would need to use in most cases.

#### redBlackTree.NodeManagerJsUint8Array<V>()
Constructor, creates JavaScript node manager with Uint8Arrays as keys. There are no public methods you would need to use in most cases.

#### redBlackTree.NodeManagerBinaryMemory(numberOfNodes: number, keySize: number, valueSize: number)
Constructor, creates Binary Memory node manager with Uint8Arrays as both keys and values. There are no public methods you would need to use in most cases.

#### redBlackTree.NodeManagerBinaryDisk.create(pathToFile: string, numberOfNodes: number, keySize: number, valueSize: number): Promise<NodeManagerBinaryDisk>
Asynchronous constructor, creates Binary Disk node manager with Uint8Arrays as both keys and values as a new file on disk.

#### redBlackTree.NodeManagerBinaryDisk.open(pathToFile: string, numberOfNodes: number, keySize: number, valueSize: number): Promise<NodeManagerBinaryDisk>
Asynchronous constructor, opens Binary Disk node manager with Uint8Arrays as both keys and values from existing file on disk.

#### redBlackTree.NodeManagerBinaryDisk.close(): Promise<void>
Closes file handlers to tree file on disk. This is the only public method you would typically use from `NodeManagerBinaryDisk` implementation.

### API: For building custom node managers

#### redBlackTree.NodeJs<K, V>
Node implementation for JavaScript node manager in case you want to create custom implementation, please refer to source code for implementation details.

#### redBlackTree.NodeManagerJs<K, V>
Abstract class for JavaScript node manager in case you want to create custom implementation, only requires comparison function to be implemented, please refer to source code for implementation details.

#### redBlackTree.INode<K, V>
Basic node interface in case you want to create custom implementation, please refer to source code for implementation details.

#### redBlackTree.INodeAsync<K, V>
Basic asynchronous node interface in case you want to create custom implementation, please refer to source code for implementation details.

#### redBlackTree.INodeManager<K, V>
Basic node manager interface in case you want to create custom implementation, please refer to source code for implementation details.

#### redBlackTree.INodeManagerAsync<K, V>
Basic asynchronous node manager interface in case you want to create custom implementation, please refer to source code for implementation details.

### Benchmarks
There are some benchmarks under `benchmarks` directory:
* `Buffer-vs-Uint8Array-vs-BigInt.ts` was used to make a choice how to compare binary values with highest speed (this is why even in Node.js `Uint8Array` is used instead of more convenient `Buffer`)
* `node-managers-vs-rocksdb-comparison.ts` compares performance of different node managers in terms of insertion and lookup performance as well as memory consumption including comparison with RocksDB

You can run them with following commands:
```bash
npm run buffer-uint-bigint-benchmark
npm run node-managers-rocksdb-benchmark
```

### Tests
Project is covered with tests that ensure things work as expected and do not regress, run them with usual `npm test`.

### Few notes about implementation decisions
First of all, many examples of Red-black tree implementation you may find online reference parent nodes from children. While this is convenient, it means some kind of reference needs to be stored in each node.
Instead of doing that, this library doesn't have parent references, but instead records the path from parent to children nodes as algorithm goes deeper into the tree.
This allows to still have enough information to do rotations and other operations, while only storing a small array of parent nodes in memory (which is up to the height of the tree).
This makes implementation a bit tricky, but also more memory efficient.

Concept of node managers was designed at a later stage specifically to decouple primary mechanics of Red-black tree like tree fixing after insertion or deletion, while making it possible to create asynchronous interface that works with disk yet still reuse most of the code.

### Credits
Huge shout-out to authors of following videos and related material, it would be much harder to implement without your excellent explanation and examples:
 * https://www.youtube.com/playlist?list=PL9xmBV_5YoZNqDI8qfOZgzbqahCUmUEin
 * https://www.youtube.com/watch?v=YCo2-H2CL6Q
 * https://www.youtube.com/watch?v=eO3GzpCCUSg
 
### License
MIT, see license.txt
