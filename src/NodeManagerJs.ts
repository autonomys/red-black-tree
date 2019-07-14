import {INodeManager} from "./INodeManager";
import {NodeJs} from "./NodeJs";

/**
 * Node manager implementation that can work with any data type supported in Node.js as a value
 */
export abstract class NodeManagerJs<K, V> implements INodeManager<K, V> {
    public root: NodeJs<K, V> | null = null;

    public addNode(key: K, value: V): NodeJs<K, V> {
        return new NodeJs(key, value);
    }

    public abstract compare(aKey: K, bKey: K): -1 | 0 | 1;

    public removeNode(): void {
        // Nothing is needed to remove a node
    }
}
