import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  notes: String,
  createdAt: { type: Date, default: Date.now },
});

const entrySchema = new mongoose.Schema({
  question: { type: String, required: true },
  feedback: String,
  idealAnswer: String,
   userAnswer: String, 
  name: { type: String, required: true },
  date: { type: Date, default: Date.now },
  notes: [noteSchema],
});

export default mongoose.model('Entry', entrySchema);
