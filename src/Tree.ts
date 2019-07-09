import {Node} from "./Node";
import {RuntimeError} from "./RuntimeError";

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

/**
 * Resources used to write this:
 * * https://www.youtube.com/playlist?list=PL9xmBV_5YoZNqDI8qfOZgzbqahCUmUEin
 * * https://www.youtube.com/watch?v=YCo2-H2CL6Q
 * * https://www.youtube.com/watch?v=eO3GzpCCUSg
 */
export class Tree<V = any> {
    private root: Node<V> | null = null;

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
            const path: Array<Node<V>> = [];
            depth: while (true) {
                path.push(currentNode);
                switch (compare(nodeToInsert.key, currentNode.key)) {
                    case -1:
                        if (currentNode.left) {
                            currentNode = currentNode.left;
                            break;
                        } else {
                            currentNode.left = nodeToInsert;
                            path.push(nodeToInsert);
                            this.fixTree(path);
                            break depth;
                        }
                    case 1:
                        if (currentNode.right) {
                            currentNode = currentNode.right;
                            break;
                        } else {
                            currentNode.right = nodeToInsert;
                            path.push(nodeToInsert);
                            this.fixTree(path);
                            break depth;
                        }
                    default:
                        // We do not insert the same key again
                        return;
                }
            }
        }
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
        if (!this.root) {
            throw new Error("Tree is empty, nothing to delete");
        }
        if (!this.root.left && !this.root.right) {
            this.root = null;
            return;
        }
        let currentNode = this.root;
        const path: Array<Node<V>> = [];
        while (true) {
            path.push(currentNode);
            switch (compare(key, currentNode.key)) {
                case -1:
                    if (currentNode.left) {
                        currentNode = currentNode.left;
                        break;
                    } else {
                        throw new Error("Can't delete a key, it doesn't exist");
                    }
                case 1:
                    if (currentNode.right) {
                        currentNode = currentNode.right;
                        break;
                    } else {
                        throw new Error("Can't delete a key, it doesn't exist");
                    }
                default:
                    if (currentNode === this.root && !this.root.left && !this.root.right) {
                        this.root = null;
                        return;
                    }
                    this.removeNodeInternal(path);
                    return;
            }
        }
    }

    /**
     * Get the closest node/key in a tree to a given target in the same key space
     *
     * @param target The target for evaluation, e.g. a challenge in the same key space
     *
     * @return The closest key to the challenge or `null` if no nodes are available
     */
    public getClosestNode(target: Uint8Array): Uint8Array | null {
        let currentNode = this.root;
        if (!currentNode) {
            return null;
        }
        while (true) {
            switch (compare(target, currentNode.key)) {
                case -1:
                    if (currentNode.left) {
                        currentNode = currentNode.left;
                        break;
                    } else {
                        return currentNode.key;
                    }
                case 1:
                    if (currentNode.right) {
                        currentNode = currentNode.right;
                        break;
                    } else {
                        return currentNode.key;
                    }
                default:
                    return currentNode.key;
            }
        }
    }

    private fixTree(path: Array<Node<V>>): void {
        while (path.length) {
            const targetNode = path.pop();
            if (!targetNode) {
                throw new RuntimeError("Can't fix path without target node, this should never happen");
            }
            const parent = path.pop();
            // `targetNode` is root, nothing left to do
            if (!parent) {
                return;
            }
            // No conflict, nothing left to do
            if (!parent.isRed) {
                return;
            }
            const grandParent = path.pop();
            if (!grandParent) {
                parent.isRed = false;
                return;
            }
            const uncle = grandParent.left === parent ? grandParent.right : grandParent.left;
            // Here we handle `null` as black `nil` node implicitly, since we do not create `nil` nodes as such
            if (uncle && uncle.isRed) {
                parent.isRed = !parent.isRed;
                grandParent.isRed = grandParent === this.root ? false : !grandParent.isRed;
                uncle.isRed = false;
                path.push(grandParent);
                continue;
            }

            // Triangle cases
            if (
                parent.left === targetNode &&
                grandParent.right === parent
            ) {
                this.rotateRight(parent, grandParent);
                path.push(grandParent, targetNode, parent);
                continue;
            } else if (
                parent.right === targetNode &&
                grandParent.left === parent
            ) {
                this.rotateLeft(parent, grandParent);
                path.push(grandParent, targetNode, parent);
                continue;
            }

            const grandGrandParent = path.pop() || null;
            // Line cases
            if (parent.left === targetNode) {
                this.rotateRight(grandParent, grandGrandParent);
            } else {
                this.rotateLeft(grandParent, grandGrandParent);
            }
            parent.isRed = !parent.isRed;
            grandParent.isRed = !grandParent.isRed;
            break;
        }
    }

    /**
     * @param rotationNode
     * @param parent       `null` if `rotationNode` is root
     */
    private rotateLeft(rotationNode: Node<V>, parent: Node<V> | null): void {
        const originalRightNode = rotationNode.right;
        if (!originalRightNode) {
            throw new RuntimeError('Right children of rotation node is null, this should never happen');
        }
        rotationNode.right = originalRightNode.left;
        originalRightNode.left = rotationNode;

        this.rotateFixParentConnection(rotationNode, originalRightNode, parent);
    }

    /**
     * @param rotationNode
     * @param parent       `null` if `rotationNode` is root
     */
    private rotateRight(rotationNode: Node<V>, parent: Node<V> | null): void {
        const originalLeftNode = rotationNode.left;
        if (!originalLeftNode) {
            throw new RuntimeError('Left children of rotation node is null, this should never happen');
        }
        rotationNode.left = originalLeftNode.right;
        originalLeftNode.right = rotationNode;

        this.rotateFixParentConnection(rotationNode, originalLeftNode, parent);
    }

    private rotateFixParentConnection(rotationNode: Node<V>, originalNode: Node<V>, parent: Node<V> | null): void {
        if (parent) {
            if (parent.left === rotationNode) {
                parent.left = originalNode;
            } else {
                parent.right = originalNode;
            }
        } else {
            this.root = originalNode;
        }
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

    private removeNodeInternal(path: Array<Node<V>>): void {
        const nodeToRemove = path.pop() as Node<V>;
        const parentNode = path.pop() || null;
        const xPath = path.slice();
        const xAndReplacement = this.determineXAndReplacement(nodeToRemove, parentNode, xPath);
        const [x, replacement] = xAndReplacement;
        let replacementParent = xAndReplacement[2];

        if (!parentNode) {
            if (!replacement) {
                throw new Error('Deleting root mode, but replacement is null, this should never happen');
            }
            this.root = replacement;
        } else {
            if (parentNode.left === nodeToRemove) {
                parentNode.left = replacement;
            } else {
                parentNode.right = replacement;
            }
        }

        if (replacement) {
            if (nodeToRemove.right === replacement) {
                replacement.left = nodeToRemove.left;
                if (replacement !== x) {
                    replacement.right = x;
                    replacementParent = replacement;
                    xPath.pop();
                }
            } else if (nodeToRemove.left === replacement) {
                replacement.right = nodeToRemove.right;
                if (replacement !== x) {
                    replacement.left = x;
                    replacementParent = replacement;
                    xPath.pop();
                }
            } else {
                replacement.left = nodeToRemove.left;
                replacement.right = nodeToRemove.right;
                if (replacementParent) {
                    if (replacementParent.left === replacement) {
                        replacementParent.left = x;
                    } else {
                        replacementParent.right = x;
                    }
                }
            }
        }

        if (
            nodeToRemove.isRed &&
            (
                !replacement ||
                replacement.isRed
            )
        ) {
            return;
        }

        if (
            nodeToRemove.isRed &&
            replacement &&
            !replacement.isRed
        ) {
            replacement.isRed = true;
            this.handleRemovalCases(x, replacementParent, xPath);
            return;
        }

        if (
            !nodeToRemove.isRed &&
            replacement &&
            replacement.isRed
        ) {
            replacement.isRed = false;
            return;
        }

        this.handleRemovalCases(x, replacementParent, xPath);
    }

    /**
     * @param nodeToRemove
     * @param nodeToRemoveParent
     * @param xPath
     *
     * @return [x, replacement, replacementParent, replacementToTheLeft]
     */
    private determineXAndReplacement(
        nodeToRemove: Node<V>,
        nodeToRemoveParent: Node<V> | null,
        xPath: Array<Node<V>>,
    ): [
        Node<V> | null,
        Node<V> | null,
        Node<V> | null,
        boolean
    ] {
        if (!nodeToRemove.left || !nodeToRemove.right) {
            const replacement = nodeToRemove.left || nodeToRemove.right;
            return [
                replacement,
                replacement,
                replacement ? nodeToRemove : nodeToRemoveParent,
                Boolean(nodeToRemove.left),
            ];
        }

        let replacement = nodeToRemove.right;
        let replacementParent = nodeToRemove;
        if (nodeToRemoveParent) {
            xPath.push(nodeToRemoveParent);
        }
        const xPathExtra: Array<Node<V>> = [];
        while (replacement.left) {
            replacementParent = replacement;
            replacement = replacement.left;
            xPathExtra.push(replacementParent);
        }
        xPathExtra.pop();
        xPath.push(replacement, ...xPathExtra);

        return [
            replacement.right,
            replacement,
            replacementParent,
            false,
        ];
    }

    private handleRemovalCases(x: Node<V> | null, xParent: Node<V> | null, xPath: Array<Node<V>>): void {
        while (true) {
            if (!xParent) {
                return;
            }
            if (!xParent.left && !xParent.right) {
                xParent.isRed = false;
                return;
            }

            // Case 0
            if (x && x.isRed) {
                x.isRed = false;
                return;
            }

            let w = xParent.left === x ? xParent.right : xParent.left;

            // Case 1
            if (
                (
                    !x ||
                    !x.isRed
                ) &&
                (
                    w &&
                    w.isRed
                )
            ) {
                w.isRed = false;
                xParent.isRed = true;
                const xParentParent = xPath.pop() || null;
                if (xParent.left === x) {
                    this.rotateLeft(xParent, xParentParent);
                } else {
                    this.rotateRight(xParent, xParentParent);
                }
                xPath.push(w);

                w = xParent.left === x ? xParent.right : xParent.left;
            }

            // Case 2
            if (
                (
                    !x ||
                    !x.isRed
                ) &&
                w &&
                !w.isRed &&
                (
                    (
                        !w.left ||
                        !w.left.isRed
                    ) &&
                    (
                        !w.right ||
                        !w.right.isRed
                    )
                )
            ) {
                w.isRed = true;
                x = xParent;
                if (x.isRed) {
                    x.isRed = false;
                    return;
                } else {
                    xParent = xPath.pop() as Node<V>;
                    if (!xParent) {
                        return;
                    }
                    w = xParent.left === x ? xParent.right : xParent.left;
                    continue;
                }
            }

            // Case 3
            if (
                (
                    !x ||
                    !x.isRed
                ) &&
                w &&
                !w.isRed &&
                (
                    (
                        xParent.left === x &&
                        w.left &&
                        w.left.isRed &&
                        (
                            !w.right ||
                            !w.right.isRed
                        )
                    ) ||
                    (
                        xParent.right === x &&
                        w.right &&
                        w.right.isRed &&
                        (
                            !w.left ||
                            !w.left.isRed
                        )
                    )
                )
            ) {
                if (xParent.left === x) {
                    if (w.left) {
                        w.left.isRed = false;
                    }
                } else if (xParent.right === x) {
                    if (w.right) {
                        w.right.isRed = false;
                    }
                }
                w.isRed = true;
                if (xParent.left === x) {
                    this.rotateRight(w, xParent);
                } else {
                    this.rotateLeft(w, xParent);
                }
                w = xParent.left === x ? xParent.right : xParent.left;
            }

            // Case 4
            if (
                (
                    !x ||
                    !x.isRed
                ) &&
                w &&
                !w.isRed &&
                (
                    (
                        xParent.left === x &&
                        w.right &&
                        w.right.isRed
                    ) ||
                    (
                        xParent.right === x &&
                        w.left &&
                        w.left.isRed
                    )
                )
            ) {
                w.isRed = xParent.isRed;
                xParent.isRed = false;
                const xParentParent = xPath.pop() || null;
                if (xParent.left === x) {
                    if (w.right) {
                        w.right.isRed = false;
                    }
                    this.rotateLeft(xParent, xParentParent);
                } else if (xParent.right === x) {
                    if (w.left) {
                        w.left.isRed = false;
                    }
                    this.rotateRight(xParent, xParentParent);
                }
                return;
            }
        }
    }
}
