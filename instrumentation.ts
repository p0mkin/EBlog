export async function register() {
    // Forces env.ts's module-level validation to run once per cold start,
    // on both Node.js and Edge runtimes. Throws immediately with a readable
    // error if any required env var is missing, instead of surfacing later
    // as a cryptic AWS SDK / Prisma connection failure mid-request.
    await import("./src/lib/env");
}
