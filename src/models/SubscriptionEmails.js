import mongoose from 'mongoose';

const subscriptionEmailSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const SubscriptionEmails = mongoose.model('SubscriptionEmails', subscriptionEmailSchema);
export default SubscriptionEmails;
