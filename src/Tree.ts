class RuntimeExceptionError extends Error {
}

class Node<V> {
    /**
     * Left children
     */
    public left: Node<V> | null;
    /**
     * Right children
     */
    public right: Node<V> | null;

    constructor(
        public readonly key: Uint8Array,
        public readonly value: V,
        public isRed: boolean,
    ) {
        this.left = null;
        this.right = null;
    }
}

export class Tree<V = any> {
    private root: Uint8Array | null = null;

    /**
     * Instantiate a new tree with desired properties
     *
     * @param keyLength Length of the key being indexed, default is 32 bytes
     */
    constructor(keyLength: number = 32) {
        this.root = null;
    }

    /**
     * Add nodes to a tree one by one (for incremental updates)
     *
     * @param key  A key to be indexed, e.g. a 32 byte piece id
     * @param value Value to be associated with a key
     */
    public addNode(key: Uint8Array, value: V): void {
        const node = new Node(key, value, true);
        // TODO: Insertion
    }

    private rotateLeft(rotationNode: Node<V>): Node<V> {
        const originalRightNode = rotationNode.right;
        if (!originalRightNode) {
            throw new RuntimeExceptionError('Right children of rotation node is null, this should never happen');
        }
        rotationNode.right = originalRightNode.left;
        originalRightNode.left = rotationNode;
        // TODO: Colors?

        return originalRightNode;
    }

    private rotateRight(rotationNode: Node<V>): Node<V> {
        const originalLeftNode = rotationNode.left;
        if (!originalLeftNode) {
            throw new RuntimeExceptionError('Left children of rotation node is null, this should never happen');
        }
        rotationNode.left = originalLeftNode.right;
        originalLeftNode.right = rotationNode;
        // TODO: Colors?

        return originalLeftNode;
    }

    // /**
    //  * Add nodes to tree as a batch, should pre-sort and add in desired order for efficiency
    //  *
    //  * @param keySet A set unique keys to be indexed in the tree
    //  */
    // public addNodeSet(keySet: Uint8Array[]) {
    // }

    /**
     * Remove a node from the tree
     *
     * @param key A key to be removed, e.g. a 32 byte piece id
     */
    public removeNode(key: Uint8Array): void {
    }

    /**
     * Get the closest node/key in a tree to a given target in the same keyspace
     *
     * @param target The target for evaluation, e.g. a challenge in the same key space
     *
     * @return The closest key to the challenge
     */
    public getClosestNode(target: Uint8Array): Uint8Array {
    }

    // /**
    //  * Save the current in-memory Tree to disk
    //  *
    //  * @param path The location on disk for storage. Should be cross-platform.
    //  */
    // public save(path: string) {
    // }
    //
    // /**
    //  * Read an existing tree from disk into memory.
    //  *
    //  * @param path The location where the tree is saved to disk. Should be cross-platform
    //  */
    // public open(path: string): Tree {
    // }
}
