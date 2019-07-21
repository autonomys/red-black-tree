import {INode} from "./interfaces/INode";
import {INodeManager} from "./interfaces/INodeManager";
import {fixTree, removeNodeImplementation} from "./RedBlackTreeMechanics";

/**
 * Resources used to write this:
 * * https://www.youtube.com/playlist?list=PL9xmBV_5YoZNqDI8qfOZgzbqahCUmUEin
 * * https://www.youtube.com/watch?v=YCo2-H2CL6Q
 * * https://www.youtube.com/watch?v=eO3GzpCCUSg
 */
export class Tree<K, V> {
    constructor(private nodeManager: INodeManager<K, V>) {
    }

    /**
     * Add nodes to a tree one by one (for incremental updates)
     *
     * @param key  A key to be indexed, e.g. a 32 byte piece id
     * @param value Value to be associated with a key
     */
    public addNode(key: K, value: V): void {
        this.addNodeInternal(key, value);
        this.nodeManager.cleanup();
    }

    /**
     * Remove a node from the tree
     *
     * @param key A key to be removed, e.g. a 32 byte piece id
     */
    public removeNode(key: K): void {
        this.removeNodeInternal(key);
        this.nodeManager.cleanup();
    }

    /**
     * Get the closest node/key in a tree to a given target in the same key space
     *
     * @param targetKey The target for evaluation, e.g. a challenge in the same key space
     *
     * @return The closest key to the challenge or `null` if no nodes are available
     */
    public getClosestNode(targetKey: K): K | null {
        const result = this.getClosestNodeInternal(targetKey);
        this.nodeManager.cleanup();
        return result;
    }

    private addNodeInternal(key: K, value: V): void {
        const nodeManager = this.nodeManager;
        const nodeToInsert = nodeManager.addNode(key, value);

        const root = nodeManager.getRoot();
        if (!root) {
            nodeToInsert.setIsRed(false);
            nodeManager.setRoot(nodeToInsert);
        } else {
            let currentNode = root;
            const path: Array<INode<K, V>> = [];
            while (true) {
                path.push(currentNode);
                switch (nodeManager.compare(nodeToInsert.getKey(), currentNode.getKey())) {
                    case -1:
                        const left = currentNode.getLeft();
                        if (left) {
                            currentNode = left;
                            break;
                        } else {
                            currentNode.setLeft(nodeToInsert);
                            path.push(nodeToInsert);
                            fixTree(this.nodeManager, path);
                            return;
                        }
                    case 1:
                        const right = currentNode.getRight();
                        if (right) {
                            currentNode = right;
                            break;
                        } else {
                            currentNode.setRight(nodeToInsert);
                            path.push(nodeToInsert);
                            fixTree(this.nodeManager, path);
                            return;
                        }
                    default:
                        // We do not insert the same key again
                        return;
                }
            }
        }
    }

    private removeNodeInternal(key: K): void {
        const nodeManager = this.nodeManager;
        const root = nodeManager.getRoot();

        if (!root) {
            throw new Error("Tree is empty, nothing to delete");
        }

        if (!root.getLeft() && !root.getRight()) {
            nodeManager.setRoot(null);
            return;
        }
        let currentNode = root;
        const path: Array<INode<K, V>> = [];
        while (true) {
            path.push(currentNode);
            switch (nodeManager.compare(key, currentNode.getKey())) {
                case -1:
                    const left = currentNode.getLeft();
                    if (left) {
                        currentNode = left;
                        break;
                    } else {
                        throw new Error("Can't delete a key, it doesn't exist");
                    }
                case 1:
                    const right = currentNode.getRight();
                    if (right) {
                        currentNode = right;
                        break;
                    } else {
                        throw new Error("Can't delete a key, it doesn't exist");
                    }
                default:
                    if (currentNode === root && !root.getLeft() && !root.getRight()) {
                        nodeManager.setRoot(null);
                        return;
                    }
                    removeNodeImplementation(this.nodeManager, path);
                    nodeManager.removeNode(currentNode);
                    return;
            }
        }
    }

    private getClosestNodeInternal(targetKey: K): K | null {
        const nodeManager = this.nodeManager;
        let currentNode = nodeManager.getRoot();
        if (!currentNode) {
            return null;
        }
        while (true) {
            const key = currentNode.getKey();
            switch (nodeManager.compare(targetKey, key)) {
                case -1:
                    const left = currentNode.getLeft();
                    if (left) {
                        currentNode = left;
                        break;
                    } else {
                        return key;
                    }
                case 1:
                    const right = currentNode.getRight();
                    if (right) {
                        currentNode = right;
                        break;
                    } else {
                        return key;
                    }
                default:
                    return key;
            }
        }
    }

}
