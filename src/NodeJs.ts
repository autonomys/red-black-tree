import {INode} from "./INode";

export class NodeJs<K, V> implements INode<K, V> {
    public isRed: boolean = true;
    public left: INode<K, V> | null = null;
    public right: INode<K, V> | null = null;

    constructor(
        public readonly key: K,
        public readonly value: V,
    ) {
    }
}
