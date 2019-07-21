import {INode} from "./INode";
import {getNumberFromBytes, setNumberToBytes} from "./utils";

export class NodeBinaryMemory implements INode<Uint8Array, Uint8Array> {
    public get isRed(): boolean {
        return this.isRedInternal;
    }

    public set isRed(isRed: boolean) {
        if (isRed !== this.isRedInternal) {
            this.isRedInternal = isRed;
            this.source.set([isRed ? 1 : 0], this.sourceOffset);
        }
    }

    /**
     * @param nodeOffsetBytes
     * @param numberOfNodes
     * @param source Binary data where contents of the node is located
     * @param sourceOffset Offset in binary data in bytes where node is located
     * @param offset
     * @param key
     * @param value
     * @param getNode
     */
    public static create(
        nodeOffsetBytes: number,
        numberOfNodes: number,
        source: Uint8Array,
        sourceOffset: number,
        offset: number,
        key: Uint8Array,
        value: Uint8Array,
        getNode: (offset: number) => NodeBinaryMemory,
    ): NodeBinaryMemory {
        const keySize = key.length;
        // Set `isRed` to `true`
        source.set([1], sourceOffset);
        // Set left child to `null`
        setNumberToBytes(
            source,
            sourceOffset + 1,
            nodeOffsetBytes,
            numberOfNodes,
        );
        // Set right child to `null`
        setNumberToBytes(
            source,
            sourceOffset + 1 + nodeOffsetBytes,
            nodeOffsetBytes,
            numberOfNodes,
        );
        // Set key
        source.set(key, sourceOffset + 1 + nodeOffsetBytes * 2);
        // Set value
        source.set(value, sourceOffset + 1 + nodeOffsetBytes * 2 + keySize);

        return new NodeBinaryMemory(
            offset,
            key,
            value.length,
            source,
            sourceOffset,
            nodeOffsetBytes,
            numberOfNodes,
            getNode,
        );
    }

    /**
     * @param nodeOffsetBytes
     * @param numberOfNodes
     * @param source Binary data where contents of the node is located
     * @param sourceOffset Offset in binary data in bytes where node is located
     * @param offset
     * @param keySize
     * @param valueSize
     * @param getNode
     */
    public static read(
        nodeOffsetBytes: number,
        numberOfNodes: number,
        source: Uint8Array,
        sourceOffset: number,
        offset: number,
        keySize: number,
        valueSize: number,
        getNode: (offset: number) => NodeBinaryMemory,
    ): NodeBinaryMemory {
        const baseOffset = sourceOffset + 1 + nodeOffsetBytes * 2;
        return new NodeBinaryMemory(
            offset,
            source.subarray(baseOffset, baseOffset + keySize),
            valueSize,
            source,
            sourceOffset,
            nodeOffsetBytes,
            numberOfNodes,
            getNode,
        );
    }

    private isRedInternal: boolean;
    private leftCache: NodeBinaryMemory | null | undefined = undefined;
    private rightCache: NodeBinaryMemory | null | undefined = undefined;

    /**
     * @param offset
     * @param key
     * @param valueSize
     * @param source Binary data where contents of the node is located
     * @param sourceOffset Offset in binary data in bytes where node is located
     * @param nodeOffsetBytes
     * @param numberOfNodes
     * @param getNode
     */
    constructor(
        public readonly offset: number,
        public readonly key: Uint8Array,
        private readonly valueSize: number,
        private readonly source: Uint8Array,
        private readonly sourceOffset: number,
        private readonly nodeOffsetBytes: number,
        private readonly numberOfNodes: number,
        private readonly getNode: (offset: number) => NodeBinaryMemory,
    ) {
        this.isRedInternal = source[sourceOffset] === 1;
    }

    public get left(): NodeBinaryMemory | null {
        if (this.leftCache === undefined) {
            const offset = getNumberFromBytes(
                this.source,
                this.sourceOffset + 1,
                this.nodeOffsetBytes,
            );

            this.leftCache = offset === this.numberOfNodes ? null : this.getNode(offset);
        }

        return this.leftCache;
    }

    public set left(node: NodeBinaryMemory | null) {
        setNumberToBytes(
            this.source,
            this.sourceOffset + 1,
            this.nodeOffsetBytes,
            node ? node.offset : this.numberOfNodes,
        );

        this.leftCache = node;
    }

    public get right(): NodeBinaryMemory | null {
        if (this.rightCache === undefined) {
            const nodeOffsetBytes = this.nodeOffsetBytes;
            const offset = getNumberFromBytes(
                this.source,
                this.sourceOffset + 1 + nodeOffsetBytes,
                nodeOffsetBytes,
            );

            this.rightCache = offset === this.numberOfNodes ? null : this.getNode(offset);
        }

        return this.rightCache;
    }

    public set right(node: NodeBinaryMemory | null) {
        const nodeOffsetBytes = this.nodeOffsetBytes;
        setNumberToBytes(
            this.source,
            this.sourceOffset + 1 + nodeOffsetBytes,
            nodeOffsetBytes,
            node ? node.offset : this.numberOfNodes,
        );

        this.rightCache = node;
    }

    public get value(): Uint8Array {
        const baseOffset = this.sourceOffset + 1 + this.nodeOffsetBytes * 2 + this.key.length;
        return this.source.subarray(baseOffset, baseOffset + this.valueSize);
    }
}
