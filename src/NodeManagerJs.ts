import {INodeManager} from "./INodeManager";
import {NodeJs} from "./NodeJs";

/**
 * Node manager implementation that can work with any data type supported in Node.js as a value
 */
export abstract class NodeManagerJs<K, V> implements INodeManager<K, V> {
    private root: NodeJs<K, V> | null = null;

    public getRoot(): NodeJs<K, V> | null {
        return this.root;
    }

    public setRoot(root: NodeJs<K, V> | null): void {
        this.root = root;
    }

    public addNode(key: K, value: V): NodeJs<K, V> {
        return new NodeJs(key, value);
    }

    public abstract compare(aKey: K, bKey: K): -1 | 0 | 1;

    public removeNode(): void {
        // Nothing is needed to remove a node
    }

    public cleanup(): void {
        // No cleanup is needed
    }
}
