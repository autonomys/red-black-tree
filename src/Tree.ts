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
     * @param key
     * @param value Value to be associated with a key
     */
    public addNode(key: K, value: V): void {
        this.addNodeInternal(key, value);
        this.nodeManager.cleanup();
    }

    /**
     * Remove a node from the tree
     *
     * @param key
     */
    public removeNode(key: K): void {
        this.removeNodeInternal(key);
        this.nodeManager.cleanup();
    }

    /**
     * Get the node value by target key
     *
     * @param targetKey
     *
     * @return
     */
    public getNodeValue(targetKey: K): V | null {
        const result = this.getClosestNodeInternal(targetKey);
        if (result && this.nodeManager.compare(result[0], targetKey) === 0) {
            return result[1];
        }
        return null;
    }

    /**
     * Get the closest node key/value in a tree to a given target key
     *
     * @param targetKey
     *
     * @return The closest key and its value to the challenge or `null` if no nodes are available
     */
    public getClosestNode(targetKey: K): [K, V] | null {
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

    private getClosestNodeInternal(targetKey: K): [K, V] | null {
        const nodeManager = this.nodeManager;
        let currentNode = nodeManager.getRoot();
        if (!currentNode) {
            return null;
        }
        const path: Array<INode<K, V>> = [];
        while (true) {
            const key = currentNode.getKey();
            path.push(currentNode);
            switch (nodeManager.compare(targetKey, key)) {
                case -1:
                    const left = currentNode.getLeft();
                    if (left) {
                        currentNode = left;
                        break;
                    } else {
                        const closestNode = this.pickClosestNode(path, targetKey);
                        return [closestNode.getKey(), closestNode.getValue()];
                    }
                case 1:
                    const right = currentNode.getRight();
                    if (right) {
                        currentNode = right;
                        break;
                    } else {
                        const closestNode = this.pickClosestNode(path, targetKey);
                        return [closestNode.getKey(), closestNode.getValue()];
                    }
                default:
                    return [key, currentNode.getValue()];
            }
        }
    }

    private pickClosestNode(nodes: Array<INode<K, V>>, targetKey: K): INode<K, V> {
        const nodeManager = this.nodeManager;
        const distances = new Map<INode<K, V>, bigint | number>();
        for (const node of nodes) {
            distances.set(node, nodeManager.distance(node.getKey(), targetKey));
        }
        return nodes.sort((nodeA, nodeB) => {
            const distanceA = distances.get(nodeA) as bigint;
            const distanceB = distances.get(nodeB) as bigint;

            if (distanceA === distanceB) {
                return 0;
            }
            return distanceA < distanceB ? -1 : 1;
        })[0];
    }
}
