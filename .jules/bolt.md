## 2024-05-18 - Replacing Recursive N+1 Queries with Single-Fetch & In-Memory Trees
**Learning:** Making N+1 queries when traversing a relational tree structure depth-first via recursive functions is a major bottleneck in Prisma.
**Action:** Instead of querying `prisma.album.findMany({ where: { parentId: currentId } })` in a recursive function, fetch the entire table into memory via `prisma.album.findMany()` and construct an in-memory `Map<string, string[]>` to represent children for rapid topological searches and resolutions. The same technique applies to counts, which should be retrieved via `prisma.photo.groupBy` in a single query.

## 2024-05-18 - Replacing Recursive Over-fetching with Lightweight Traversals
**Learning:** Making heavy queries (fetching relations like children, photos, permissions) inside a loop when resolving a tree path is a major bottleneck.
**Action:** Instead of fetching heavy relational data for every node in a path traversal, perform lightweight queries (e.g., \`findFirst({ select: { id: true } })\`) to find the target node ID, and then execute a single heavy query for the target node only.
