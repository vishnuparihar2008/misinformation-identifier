import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: ['telegram', 'whatsapp', 'web'],
      required: true,
    },
    externalId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    installerRef: {
      type: String,
      required: true,
    },
    disclosureSentAt: {
      type: Date,
      default: null,
    },
    nudgeThreshold: {
      type: Number,
      default: 0.70,
      min: 0.0,
      max: 1.0,
    },
    installerChatId: {
      type: String,
      default: null,
      index: true,
    },
    isPaused: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

groupSchema.index({ platform: 1, externalId: 1 }, { unique: true });

export const Group = mongoose.model('Group', groupSchema);

