import mongoose from 'mongoose';

const listingSchema = new mongoose.Schema(
  {
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    externalUrl: {
      type: String,
      required: true,
    },
    region: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    tradition: {
      type: String,
      required: true,
    },
    culturalTags: [
      {
        type: String,
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    image: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

listingSchema.index({ title: 'text', country: 'text', tradition: 'text' });

const Listing = mongoose.model('Listing', listingSchema);
export default Listing;
