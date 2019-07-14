export interface INode<K, V> {
    /**
     * Whether node is red
     */
    isRed: boolean;
    /**
     * Node key
     */
    key: K;
    /**
     * Left children
     */
    left: INode<K, V> | null;
    /**
     * Right children
     */
    right: INode<K, V> | null;
    /**
     * Value associated with node
     */
    value: V;
}
