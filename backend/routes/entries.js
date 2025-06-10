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
// POST /api/entries/:id/add-note
router.post('/:id/add-note', async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;

  try {
    const updatedEntry = await Entry.findByIdAndUpdate(
      id,
      { $push: { notes: { notes: note } } },
       { createdAt: new Date()},
      { new: true }
       
    );

    res.status(200).json(updatedEntry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// DELETE /api/entries/clear
router.delete('/clear', async (req, res) => {
  const { username } = req.body;
  try {
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    await Entry.deleteMany({ name: username }); // only delete entries for the specific user
    res.status(200).json({ message: `Entries for ${username} cleared` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear entries' });
  }
});


export default router;
