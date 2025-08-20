import mongoose from 'mongoose';

const entrySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: String,
  question: String,
  feedback: String,
  ideal_answer: String,
  datetime: { type: Date, default: Date.now },
  notes: String,
});

export default mongoose.model('Entry', entrySchema);
