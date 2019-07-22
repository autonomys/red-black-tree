import * as fs from "fs";

export class File {
    public static async open(pathToFile: string): Promise<File> {
        const handle = await fs.promises.open(pathToFile, 'r+');

        return new File(handle);
    }

    private lastTransactionPromise: Promise<any> = Promise.resolve();

    constructor(private readonly handle: fs.promises.FileHandle) {
    }

    public read(offset: number, bytes: number): Promise<Uint8Array> {
        // TODO: Implement batching of read transactions for potentially better performance, potentially with higher priority than write transaction
        const transaction = this.lastTransactionPromise.then(async () => {
            const buffer = Buffer.allocUnsafe(bytes);
            await this.handle.read(buffer, 0, bytes, offset);
            return new Uint8Array(buffer);
        });
        this.lastTransactionPromise = transaction.catch(() => {
            // Just to avoid unhandled promise exception
        });
        return transaction;
    }

    public write(offset: number, value: Uint8Array): Promise<void> {
        const transaction = this.lastTransactionPromise.then(async () => {
            await this.handle.write(value, 0, value.length, offset);
        });
        this.lastTransactionPromise = transaction.catch(() => {
            // Just to avoid unhandled promise exception
        });
        return transaction;
    }

    public async close(): Promise<void> {
        await this.handle.close();
    }
}
