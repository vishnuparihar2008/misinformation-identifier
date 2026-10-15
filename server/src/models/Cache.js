import mongoose from 'mongoose';

const cacheSchema = new mongoose.Schema(
  {
    textHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Expire cache after 7 days
cacheSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

export const Cache = mongoose.model('Cache', cacheSchema);

