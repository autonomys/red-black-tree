import {INode} from "./INode";

export class NodeJs<K, V> implements INode<K, V> {
    private isRed: boolean = true;
    private left: NodeJs<K, V> | null = null;
    private right: NodeJs<K, V> | null = null;

    constructor(
        private readonly key: K,
        private readonly value: V,
    ) {
    }

    public getIsRed(): boolean {
        return this.isRed;
    }

    public setIsRed(isRed: boolean): void {
        this.isRed = isRed;
    }

    public getKey(): K {
        return this.key;
    }

    public getLeft(): NodeJs<K, V> | null {
        return this.left;
    }

    public setLeft(node: NodeJs<K, V> | null): void {
        this.left = node;
    }

    public getRight(): NodeJs<K, V> | null {
        return this.right;
    }

    public setRight(node: NodeJs<K, V> | null): void {
        this.right = node;
    }

    public getValue(): V {
        return this.value;
    }
}
