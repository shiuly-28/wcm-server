import mongoose from 'mongoose';

const interactionLogSchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ip: { type: String, required: true },
  type: { type: String, enum: ['view', 'ppc_click'], required: true },
  userAgent: { type: String },
  createdAt: { type: Date, default: Date.now, expires: 86400 },
});

interactionLogSchema.index({ listingId: 1, userId: 1, type: 1 });
interactionLogSchema.index({ listingId: 1, ip: 1, type: 1 });

const InteractionLog = mongoose.model('InteractionLog', interactionLogSchema);
export default InteractionLog;
