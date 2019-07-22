import {INode} from "./INode";
import {INodeManagerBase} from "./INodeManagerBase";

export interface INodeManager<K, V> extends INodeManagerBase<K, V> {
    addNode(key: K, value: V): INode<K, V>;

    compare(aKey: K, bKey: K): -1 | 0 | 1;

    removeNode(node: INode<K, V>): void;

    /**
     * Clean temporary caches that may be needed for node manager to work properly and/or efficiently
     */
    cleanup(): void;
}
