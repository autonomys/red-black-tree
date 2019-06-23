class RuntimeExceptionError extends Error {
}

/**
 * @param a
 * @param b
 *
 * @return `-1` if `a` is smaller than `b`, `1` is `a` is bigger than `b` and `0` if they are equal
 */
function compare(a: Uint8Array, b: Uint8Array): number {
    const length = a.length;
    for (let i = 0; i < length; ++i) {
        const diff = a[i] - b[i];
        if (diff < 0) {
            return -1;
        } else if (diff > 0) {
            return 1;
        }
    }
    return 0;
}

class Node<V> {
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

export class Tree<V = any> {
    private root: Node<V> | null = null;

    /**
     * Instantiate a new tree with desired properties
     */
    constructor() {
        this.root = null;
    }

    /**
     * Add nodes to a tree one by one (for incremental updates)
     *
     * @param key  A key to be indexed, e.g. a 32 byte piece id
     * @param value Value to be associated with a key
     */
    public addNode(key: Uint8Array, value: V): void {
        const nodeToInsert = new Node(key, value);

        if (!this.root) {
            nodeToInsert.isRed = false;
            this.root = nodeToInsert;
        } else {
            let currentNode = this.root;
            let parent: Node<V> | null = null;
            let grandParent: Node<V> | null;
            depth: while (true) {
                grandParent = parent;
                parent = currentNode;
                switch (compare(nodeToInsert.key, currentNode.key)) {
                    case -1:
                        if (currentNode.left) {
                            currentNode = currentNode.left;
                            break;
                        } else {
                            // TODO: This branch
                            const uncle = grandParent && grandParent.left;
                            this.fixTree();
                            break depth;
                        }
                    case 1:
                        if (currentNode.right) {
                            currentNode = currentNode.right;
                            break;
                        } else {
                            // TODO: This branch
                            const uncle = grandParent && grandParent.right;
                            this.fixTree();
                            break depth;
                        }
                    default:
                        // We do not insert the same key again
                        return;
                }
            }
        }
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
