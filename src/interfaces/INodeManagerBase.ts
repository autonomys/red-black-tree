import {INode} from "./INode";

/**
 * Reduced interface that only has methods needed for mechanics code to work
 */
export interface INodeManagerBase<K, V> {
    getRoot(): INode<K, V> | null;

    setRoot(root: INode<K, V> | null): void;
}
