import mongoose, { ClientSession } from "mongoose";

/**
 * Execute operations within a MongoDB transaction if replica set supports it,
 * or gracefully execute as a direct sequence if transactions aren't supported (e.g. local standalone mongo).
 */
export async function withTransaction<T>(
  callback: (session?: ClientSession) => Promise<T>
): Promise<T> {
  let session: ClientSession | null = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error: any) {
    // If transactions are not supported on standalone mongod (code 20 or message contains 'Transaction numbers are only allowed on a replica set member')
    if (
      error.message?.includes("replica set") ||
      error.code === 20 ||
      error.message?.includes("standalone")
    ) {
      if (session) {
        try {
          await session.abortTransaction();
        } catch {}
        session.endSession();
        session = null;
      }
      // Execute directly without transaction session
      return await callback(undefined);
    }

    if (session) {
      try {
        await session.abortTransaction();
      } catch {}
    }
    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }
}
