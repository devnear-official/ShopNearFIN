import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/shopnearfin";

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
    // Auto-clean any legacy non-sparse transactionNumber_1 index from previous schemas
    if (cached.conn && cached.conn.connection && cached.conn.connection.db) {
      cached.conn.connection.db
        .collection("transactions")
        .indexes()
        .then((indexes) => {
          const legacyIdx = indexes.find((i: any) => i.name === "transactionNumber_1");
          if (legacyIdx && !legacyIdx.sparse) {
            return cached.conn!.connection.db!
              .collection("transactions")
              .dropIndex("transactionNumber_1")
              .catch(() => {});
          }
        })
        .catch(() => {});
    }
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
