import * as fs from "fs";
import {RuntimeError} from "../../../RuntimeError";
import {compareUint8Array, maxNumberToBytes} from "../../../utils";
import {NodeManagerAsyncGeneric} from "../../NodeManagerAsyncGeneric";
import {File} from "./File";
import {NodeBinaryDisk} from "./NodeBinaryDisk";
import {getNumberFromFileBytes, setNumberToFileBytes} from "./utils";

async function allocateEmptyFile(path: string, size: number, chunkSize: number): Promise<void> {
    const fileHandle = await fs.promises.open(path, 'w');
    let written = 0;
    const emptyPiece = Buffer.alloc(chunkSize);
    while (written < size) {
        await fileHandle.write(emptyPiece.slice(0, Math.min(chunkSize, size - written)));
        written += chunkSize;
    }
    await fileHandle.close();
}

/**
 * Node manager implementation that can work with any data type supported in Node.js as a value
 */
export class NodeManagerBinaryDisk extends NodeManagerAsyncGeneric<Uint8Array, Uint8Array> {
    /**
     * @param pathToFile Full path to the file where data will be stored
     * @param numberOfNodes Max number of nodes that are expected to be stored
     * @param keySize Size of the key in bytes
     * @param valueSize Size of the values associated with a key in bytes
     */
    public static async create(pathToFile: string, numberOfNodes: number, keySize: number, valueSize: number): Promise<NodeManagerBinaryDisk> {
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
        // Allocate the whole file upfront for better performance, write in chunks of 2MiB
        await allocateEmptyFile(pathToFile, allocationSize, 1024 * 1024 * 2);

        const instance = await NodeManagerBinaryDisk.open(pathToFile, numberOfNodes, keySize, valueSize);

        await instance.setFreeNodeOffset(0);
        await instance.setDeletedNodeOffset(numberOfNodes);
        await instance.setRootNodeOffset(numberOfNodes);

        return instance;
    }

    /**
     * @param pathToFile Full path to the file where data is stored
     * @param numberOfNodes Max number of nodes that are expected to be stored
     * @param keySize Size of the key in bytes
     * @param valueSize Size of the values associated with a key in bytes
     */
    public static async open(pathToFile: string, numberOfNodes: number, keySize: number, valueSize: number): Promise<NodeManagerBinaryDisk> {
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
        const storageSize = (await fs.promises.stat(pathToFile)).size;

        if (storageSize !== allocationSize) {
            throw new Error(`Actual storage size of ${storageSize} bytes doesn't match expected allocation size of ${allocationSize} bytes`);
        }
        const storageData = await File.open(pathToFile);

        return new NodeManagerBinaryDisk(
            storageData,
            numberOfNodes,
            nodeOffsetBytes,
            keySize,
            valueSize,
            singleNodeAllocationSize,
        );
    }

    public compare = compareUint8Array;

    private rootCache: NodeBinaryDisk | null | undefined = undefined;

    private constructor(
        private readonly storageData: File,
        private readonly numberOfNodes: number,
        private readonly nodeOffsetBytes: number,
        private readonly keySize: number,
        private readonly valueSize: number,
        private readonly singleNodeAllocationSize: number,
    ) {
        super();
    }

    public async getRootAsync(): Promise<NodeBinaryDisk | null> {
        if (this.rootCache === undefined) {
            const offset = await this.getRootNodeOffset();
            this.rootCache = offset === this.numberOfNodes ? null : await this.getNode(offset);
        }

        return this.rootCache;
    }

    public async addNodeAsync(key: Uint8Array, value: Uint8Array): Promise<NodeBinaryDisk> {
        const offset = await this.allocateOffsetForAddition();
        const singleNodeAllocationSize = this.singleNodeAllocationSize;
        const nodeOffsetBytes = this.nodeOffsetBytes;
        return NodeBinaryDisk.create(
            nodeOffsetBytes,
            this.numberOfNodes,
            this.storageData,
            nodeOffsetBytes * 3 + singleNodeAllocationSize * offset,
            offset,
            key,
            value,
            this.getNode.bind(this),
        );
    }

    public async removeNodeAsync(node: NodeBinaryDisk): Promise<void> {
        const singleNodeAllocationSize = this.singleNodeAllocationSize;
        const nodeOffsetBytes = this.nodeOffsetBytes;
        const offset = node.offset;
        const lastDeletedOffset = await this.getDeletedNodeOffset();
        // Store previous last deleted node in currently deleting node data
        await setNumberToFileBytes(
            this.storageData,
            nodeOffsetBytes * 3 + singleNodeAllocationSize * offset,
            nodeOffsetBytes,
            lastDeletedOffset,
        );
        // Update last deleted node offset
        return this.setDeletedNodeOffset(offset);
    }

    public getRoot(): NodeBinaryDisk | null {
        if (this.rootCache === undefined) {
            throw new RuntimeError('getRootAsync() needs to be called first');
        }

        return this.rootCache;
    }

    public setRoot(node: NodeBinaryDisk | null): void {
        this.rootCache = node;
        this.setRootNodeOffset(
            node === null ? this.numberOfNodes : node.offset,
        )
            .catch(() => {
                // Just to avoid unhandled promise exception
            });
    }

    public cleanup(): void {
        this.rootCache = undefined;
    }

    public close(): Promise<void> {
        return this.storageData.close();
    }

    private async allocateOffsetForAddition(): Promise<number> {
        const numberOfNodes = this.numberOfNodes;
        const nodeOffsetBytes = this.nodeOffsetBytes;
        const singleNodeAllocationSize = this.singleNodeAllocationSize;

        const offset = await this.getFreeNodeOffset();
        if (offset !== numberOfNodes) {
            await this.setFreeNodeOffset(offset + 1);
            return offset;
        } else {
            const offset = await this.getDeletedNodeOffset();
            if (offset === numberOfNodes) {
                throw new RuntimeError("No space left for new nodes");
            }
            // By convention deleted node stores offset of previous deleted node in its first bytes
            const previousOffset = await getNumberFromFileBytes(
                this.storageData,
                nodeOffsetBytes * 3 + singleNodeAllocationSize * offset,
                nodeOffsetBytes,
            );
            this.setDeletedNodeOffset(previousOffset);
            return offset;
        }
    }

    private getNode(offset: number): Promise<NodeBinaryDisk> {
        const singleNodeAllocationSize = this.singleNodeAllocationSize;
        const nodeOffsetBytes = this.nodeOffsetBytes;
        return NodeBinaryDisk.read(
            nodeOffsetBytes,
            this.numberOfNodes,
            this.storageData,
            nodeOffsetBytes * 3 + singleNodeAllocationSize * offset,
            offset,
            this.keySize,
            this.valueSize,
            this.getNode.bind(this),
        );
    }

    private getFreeNodeOffset(): Promise<number> {
        return getNumberFromFileBytes(this.storageData, 0, this.nodeOffsetBytes);
    }

    private setFreeNodeOffset(offset: number): Promise<void> {
        return setNumberToFileBytes(this.storageData, 0, this.nodeOffsetBytes, offset);
    }

    private getDeletedNodeOffset(): Promise<number> {
        const nodeOffsetBytes = this.nodeOffsetBytes;
        return getNumberFromFileBytes(this.storageData, nodeOffsetBytes, nodeOffsetBytes);
    }

    private setDeletedNodeOffset(offset: number): Promise<void> {
        const nodeOffsetBytes = this.nodeOffsetBytes;
        return setNumberToFileBytes(this.storageData, nodeOffsetBytes, nodeOffsetBytes, offset);
    }

    private getRootNodeOffset(): Promise<number> {
        const nodeOffsetBytes = this.nodeOffsetBytes;
        return getNumberFromFileBytes(this.storageData, nodeOffsetBytes * 2, nodeOffsetBytes);
    }

    private setRootNodeOffset(offset: number): Promise<void> {
        const nodeOffsetBytes = this.nodeOffsetBytes;
        return setNumberToFileBytes(this.storageData, nodeOffsetBytes * 2, nodeOffsetBytes, offset);
    }
}
