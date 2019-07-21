## Binary Search Tree (BST)

### Overview

We need a way to quickly find the closest piece for a given challenge. Since we are comparing the entire bitstring, bit-by-bit, a BST appears to be the most efficient data structure. Unfortunately I could not find a Javascript implementation that deals directly with binary data, or any that had Typescript bindings.

Should be able to work as in-memory BST, or an on-disk B-Tree depending on the size of the plot and resources available to a node. The BST would return the closest key to target with log(N) memory queries, while the B-Tree should return the closest key to a target with log(N) disk reads, where N is the number of nodes in the tree.

Should also be able to work with variable sized keys as a 'forest' of search 'trees' to prevent certain classes of compression attacks.

### RAM Storage Backend (critical)

Default for smaller plots or farmers with high RAM. Reads and writes new nodes directly to memory for faster access. Should consume roughly 8 to 9 GB of RAM per 1 TB of pieces indexed, which will be a limiting factor. Saves the tree to disk periodically or after updates in order to persist in case of shutdown. Can later be loaded from disk on restart.

### Disk Storage Backend (advanced)

Default for larger plots or farmers with lower RAM. Reads and writes new nodes directly to disk. Should consume roughly the same amount of space as above, but with slower read and write times based on the type of disk being used. This is technically a B-tree and may be too much to incoprate into this repository. It may instead be a seperate library, but regardless they should have a similar API and basic operation. The B-tree should 

### Variable Key Size (advanced)

The default key size for comparison should be 32 bytes, given a 32 byte challenge (target) and a set of 32 byte piece ids (nodes). If keys are uniformaly distributed across the key space then we can predict the proximity of the closest piece for any challenge, based on the number of pieces or encodings that exist on the network across all nodes. A rational node could compress their search tree to only store keys up to the expected proximity. For example, if the average proximity of a solution is 3 bytes, they might store 4 bytes for each piece in the tree and gain an 8x space advantage.

One possible countermeasure is to break each challenge into chunks, of length at or near the current work difficulty and then pick a chunk index at random. This would require each node to store a different search tree for each chunk index, and they would no longer be able to compress their indexes. This would also require them to recompute their indexes each time the work difficulty changes. This would result in a 'forest' of search 'trees', with a different tree selected for each challenge.

### Concurrency Caveats

Take care to ensure that a query for a closest node will be queued if new nodes are currently being added or removed, likewise for persitence to disk. 

### Preformance Caveats

Speed is the goal. Time is of the essence for nodes trying to solve the puzze. Every nanonsecond counts, so this needs to be designed such that search preformance is the key design criteria.

### Desired API

```typescript

class Tree {

  /**
   * Instantiate a new tree with desired properties
   * 
   * @param keyLength Length of the key being indexed, default is 32 bytes
   * @param storage RAM or Disk storage backend
   * 
   * @return tree instance
   */
  constructor(keyLength: number, storage: string) {}

  /**
   * Add nodes to a tree one by one (for incremental updates)
   * 
   * @param key  A key to be indexed, e.g. a 32 byte piece id
   */
  addNode(key: Buffer) {}

  /**
   * Add nodes to tree as a batch, should pre-sort and add in desired order for effeciency 
   * 
   * @param keySet A set unique keys to be indexed in the tree  
   */
  addNodeSet(keySet: Buffer[]) {}

  /**
   * Remove a node from the tree
   * 
   * @param key A key to be removed, e.g. a 32 byte piece id
   */
  removeNode(key: Buffer) {}

  /**
   * Get the closest node/key in a tree to a given target in the same keyspace
   * 
   * @param target The target for evaluation, e.g. a challenge in the same key space
   *
   * @return The closest key to the challenge
   */
  getClosestNode(target: Buffer): Buffer {}

  /**
   * Save the current in-memory Tree to disk
   * 
   * @param path The location on disk for storage. Should be cross-platform.
   */
  save(path: string) {}

  /**
   * Read an existing tree from disk into memory.
   * 
   * @param path The locaiton where the tree is saved to disk. Should be cross-platform
   */
  open(path: string): Tree {}

}

```
