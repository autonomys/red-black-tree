export class Node<V> {
    /**
     * Node is red by default, but may turn black or red again as needed
     */
    public isRed: boolean = true;
    /**
     * Left children
     */
    public left: Node<V> | null = null;
    /**
     * Right children
     */
    public right: Node<V> | null = null;

    constructor(
        public readonly key: Uint8Array,
        public readonly value: V,
    ) {
    }
}
