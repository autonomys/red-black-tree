import {INode} from "./INode";

export interface INodeManager<K, V> {
    root: INode<K, V> | null;

    addNode(key: K, value: V): INode<K, V>;

    compare(aKey: K, bKey: K): -1 | 0 | 1;

    removeNode(key: K): void;
}
