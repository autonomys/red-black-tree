import {INodeManager} from "./INodeManager";
import {NodeBinaryMemory} from "./NodeBinaryMemory";
import {RuntimeError} from "./RuntimeError";
import {compareUint8Array, getOffsetFromBytes, maxNumberToBytes, setOffsetToBytes} from "./utils";

/**
 * Node manager implementation that can work with any data type supported in Node.js as a value
 */
export class NodeManagerBinaryMemory implements INodeManager<Uint8Array, Uint8Array> {
    public get root(): NodeBinaryMemory | null {
        const offset = this.getRootNodeOffset();
        return offset === this.numberOfNodes ? null : this.getNode(offset);
    }

    public set root(node: NodeBinaryMemory | null) {
        if (node === null) {
            this.setRootNodeOffset(this.numberOfNodes);
        } else {
            this.setRootNodeOffset(node.offset);
        }
    }

    /**
     * @param numberOfNodes Max number of nodes that are expected to be stored
     * @param keySize Size of the key in bytes
     * @param valueSize Size of the values associated with a key in bytes
     */
    public static create(numberOfNodes: number, keySize: number, valueSize: number): NodeManagerBinaryMemory {
        // offset starts from 0, but addresses with index of last possible node + 1 will be treated as `null` node for everyone to reference
        const nodeOffsetBytes = maxNumberToBytes(numberOfNodes);
        // 1 byte for red/black flag and 2 * nodeOffsetBytes for left and right children
        const nodeMetadataSize = 1 + nodeOffsetBytes * 2;
        const singleNodeAllocationSize = nodeMetadataSize + keySize + valueSize;
        /**
         * * one offset for the first free offset for the next node to be inserted
         * * one offset for last deleted node that can be used to add another node
         * * one offset for root node offset
         */
        const commonMetadataSize = nodeOffsetBytes * 3;
        const allocationSize = commonMetadataSize + numberOfNodes * singleNodeAllocationSize;
        const buffer = Buffer.allocUnsafe(allocationSize);
        const uint8Array = new Uint8Array(buffer.buffer);

        const instance = new NodeManagerBinaryMemory(
            uint8Array,
            numberOfNodes,
            nodeOffsetBytes,
            keySize,
            valueSize,
            singleNodeAllocationSize,
        );

        instance.setFreeNodeOffset(0);
        instance.setDeletedNodeOffset(numberOfNodes);
        instance.setRootNodeOffset(numberOfNodes);

        return instance;
    }

    public compare = compareUint8Array;

    private constructor(
        private readonly uint8Array: Uint8Array,
        private readonly numberOfNodes: number,
        private readonly nodeOffsetBytes: number,
        private readonly keySize: number,
        private readonly valueSize: number,
        private readonly singleNodeAllocationSize: number,
    ) {
    }

    public addNode(key: Uint8Array, value: Uint8Array): NodeBinaryMemory {
        const offset = this.allocateOffsetForAddition();
        const singleNodeAllocationSize = this.singleNodeAllocationSize;
        const nodeOffsetBytes = this.nodeOffsetBytes;
        const nodeData = this.uint8Array.subarray(
            nodeOffsetBytes * 3 + singleNodeAllocationSize * offset,
            nodeOffsetBytes * 3 + singleNodeAllocationSize * (offset + 1),
        );
        return NodeBinaryMemory.create(
            nodeOffsetBytes,
            this.numberOfNodes,
            nodeData,
            offset,
            key,
            value,
            this.getNode.bind(this),
        );
    }

    public removeNode(node: NodeBinaryMemory): void {
        const singleNodeAllocationSize = this.singleNodeAllocationSize;
        const nodeOffsetBytes = this.nodeOffsetBytes;
        const offset = node.offset;
        const nodeData = this.uint8Array.subarray(
            nodeOffsetBytes * 3 + singleNodeAllocationSize * offset,
            nodeOffsetBytes * 3 + singleNodeAllocationSize * (offset + 1),
        );
        const lastDeletedOffset = this.getDeletedNodeOffset();
        // Store previous last deleted node in currently deleting node data
        setOffsetToBytes(nodeData, this.nodeOffsetBytes, lastDeletedOffset);
        // Update last deleted node offset
        this.setDeletedNodeOffset(offset);
    }

    private allocateOffsetForAddition(): number {
        const numberOfNodes = this.numberOfNodes;
        const nodeOffsetBytes = this.nodeOffsetBytes;
        const singleNodeAllocationSize = this.singleNodeAllocationSize;

        const offset = this.getFreeNodeOffset();
        if (offset !== numberOfNodes) {
            this.setFreeNodeOffset(offset + 1);
            return offset;
        } else {
            const offset = this.getDeletedNodeOffset();
            if (offset === numberOfNodes) {
                throw new RuntimeError("No space left for new nodes");
            }
            const deletedNode = this.uint8Array.subarray(
                nodeOffsetBytes * 3 + singleNodeAllocationSize * offset,
                nodeOffsetBytes * 3 + singleNodeAllocationSize * (offset + 1),
            );
            // By convention deleted node stores offset of previous deleted node in its first bytes
            const previousOffset = getOffsetFromBytes(deletedNode, nodeOffsetBytes);
            this.setDeletedNodeOffset(previousOffset);
            return offset;
        }
    }

    private getNode(offset: number): NodeBinaryMemory {
        const singleNodeAllocationSize = this.singleNodeAllocationSize;
        const nodeOffsetBytes = this.nodeOffsetBytes;
        const nodeData = this.uint8Array.subarray(
            nodeOffsetBytes * 3 + singleNodeAllocationSize * offset,
            nodeOffsetBytes * 3 + singleNodeAllocationSize * (offset + 1),
        );
        return NodeBinaryMemory.read(
            nodeOffsetBytes,
            this.numberOfNodes,
            nodeData,
            offset,
            this.keySize,
            this.valueSize,
            this.getNode.bind(this),
        );
    }

    private getFreeNodeOffset(): number {
        const nodeOffsetBytes = this.nodeOffsetBytes;
        const nextFreeNode = this.uint8Array.subarray(0, nodeOffsetBytes);
        return getOffsetFromBytes(nextFreeNode, nodeOffsetBytes);
    }

    private setFreeNodeOffset(offset: number): void {
        const nodeOffsetBytes = this.nodeOffsetBytes;
        const nextFreeNode = this.uint8Array.subarray(0, nodeOffsetBytes);
        setOffsetToBytes(nextFreeNode, nodeOffsetBytes, offset);
    }

    private getDeletedNodeOffset(): number {
        const nodeOffsetBytes = this.nodeOffsetBytes;
        const lastDeletedNode = this.uint8Array.subarray(nodeOffsetBytes, nodeOffsetBytes * 2);
        return getOffsetFromBytes(lastDeletedNode, nodeOffsetBytes);
    }

    private setDeletedNodeOffset(offset: number): void {
        const nodeOffsetBytes = this.nodeOffsetBytes;
        const lastDeletedNode = this.uint8Array.subarray(nodeOffsetBytes, nodeOffsetBytes * 2);
        setOffsetToBytes(lastDeletedNode, nodeOffsetBytes, offset);
    }

    private getRootNodeOffset(): number {
        const nodeOffsetBytes = this.nodeOffsetBytes;
        const rootNode = this.uint8Array.subarray(nodeOffsetBytes * 2, nodeOffsetBytes * 3);
        return getOffsetFromBytes(rootNode, nodeOffsetBytes);
    }

    private setRootNodeOffset(offset: number): void {
        const nodeOffsetBytes = this.nodeOffsetBytes;
        const rootNode = this.uint8Array.subarray(nodeOffsetBytes * 2, nodeOffsetBytes * 3);
        setOffsetToBytes(rootNode, nodeOffsetBytes, offset);
    }
}
