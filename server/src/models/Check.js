import mongoose from 'mongoose';

const tacticSchema = new mongoose.Schema(
  {
    code: { type: String, required: true },
    explanation: { type: String, required: true },
  },
  { _id: false }
);

const sourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    url: { type: String, required: true },
    publisher: { type: String, default: '' },
    rating: { type: String, default: '' },
  },
  { _id: false }
);

const replyVariantSchema = new mongoose.Schema(
  {
    tone: {
      type: String,
      enum: ['gentle', 'factual', 'short'],
      required: true,
    },
    text: { type: String, required: true },
  },
  { _id: false }
);

const checkSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      default: null,
      index: true,
    },
    platform: {
      type: String,
      enum: ['telegram', 'whatsapp', 'web'],
      default: 'web',
      required: true,
    },
    messageId: {
      type: String,
      required: true,
      index: true,
    },
    senderRef: {
      type: String,
      required: true,
    },
    textHash: {
      type: String,
      required: true,
      index: true,
    },
    text: {
      type: String,
      default: null,
    },
    hasImage: {
      type: Boolean,
      default: false,
    },
    language: {
      type: String,
      enum: ['en', 'hi', 'hinglish', 'other'],
      default: 'en',
    },
    status: {
      type: String,
      enum: [
        'received',
        'ignored',
        'analyzing',
        'completed',
        'nudged',
        'approved',
        'dismissed',
        'failed',
      ],
      default: 'received',
      index: true,
    },
    gate: {
      isClaim: { type: Boolean, default: false },
      claimText: { type: String, default: '' },
      reason: { type: String, default: '' },
    },
    verdict: {
      type: String,
      enum: ['likely_false', 'misleading', 'likely_true', 'unverified', 'not_a_claim', null],
      default: null,
      index: true,
    },
    confidence: {
      type: Number,
      default: null,
      min: 0.0,
      max: 1.0,
    },
    summary: {
      type: String,
      default: '',
    },
    tactics: [tacticSchema],
    sources: [sourceSchema],
    uncertaintyNote: {
      type: String,
      default: null,
    },
    imageFindings: {
      earliestSeen: {
        url: { type: String },
        date: { type: String },
      },
      whatItShowed: { type: String },
    },
    replyVariants: [replyVariantSchema],
    approvedReply: {
      tone: { type: String },
      text: { type: String },
      edited: { type: Boolean, default: false },
      postedAt: { type: Date },
    },
    failureReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Unique check per platform, group and message ID
checkSchema.index({ platform: 1, groupId: 1, messageId: 1 }, { unique: true });
// Fast sorting for recent checks
checkSchema.index({ createdAt: -1 });

export const Check = mongoose.model('Check', checkSchema);

