import express from 'express';
import Entry from '../models/Entry.js';

const router = express.Router();

// Create entry
router.post('/add', async (req, res) => {
  try {
    const entry = new Entry(req.body);
    await entry.save();
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get entries by username
router.get('/', async (req, res) => {
  const { username } = req.query;
  try {
    // Make sure 'name' matches with the correct field in your schema
    const entries = await Entry.find({ name: username }).sort({ date: -1 });
    res.status(200).json(entries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a note to an entry
// PUT /api/entries/:id/notes
router.put("/api/entries/:id/notes", async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  try {
    const result = await Entry.findByIdAndUpdate(id, { notes }, { new: true });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to update notes" });
  }
});


export default router;
