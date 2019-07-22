import {INode} from "./INode";

/**
 * Despite `INodeAsync` extends `INode`, its implementation has different properties:
 * * getting left/right children and node value must be done asynchronously the first time, later cache will allow synchronous methods to work, otherwise
 *   `RuntimeError` exception will be thrown!
 * * setting is done synchronously using in-memory cache and asynchronously on disk, which means that there is no guarantee as to when data was actually
 *   persisted on disk, users mush ensure not doing multiple transactions concurrently (like removing one node, adding another node or getting closest node)
 */
export interface INodeAsync<K, V> extends INode<K, V> {
    /**
     * Left children
     */
    getLeftAsync(): Promise<INodeAsync<K, V> | null>;

    /**
     * Right children
     */
    getRightAsync(): Promise<INodeAsync<K, V> | null>;

    /**
     * Value associated with node
     */
    getValueAsync(): Promise<V>;

    /**
     * Left children
     */
    getLeft(): INodeAsync<K, V> | null;

    setLeft(node: INodeAsync<K, V> | null): void;

    /**
     * Right children
     */
    getRight(): INodeAsync<K, V> | null;

    setRight(node: INodeAsync<K, V> | null): void;
}
