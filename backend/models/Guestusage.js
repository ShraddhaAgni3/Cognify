import mongoose from 'mongoose';

const guestUsageSchema = new mongoose.Schema({
  clientId: { type: String, required: true, unique: true },
  atsChecks: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  lastUsed: { type: Date, default: Date.now }
});

export default mongoose.model('GuestUsage', guestUsageSchema);