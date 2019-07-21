export interface INode<K, V> {
    /**
     * Whether node is red
     */
    getIsRed(): boolean;

    setIsRed(isRed: boolean): void;

    /**
     * Node key
     */
    getKey(): K;

    /**
     * Left children
     */
    getLeft(): INode<K, V> | null;

    setLeft(node: INode<K, V> | null): void;

    /**
     * Right children
     */
    getRight(): INode<K, V> | null;

    setRight(node: INode<K, V> | null): void;

    /**
     * Value associated with node
     */
    getValue(): V;
}
