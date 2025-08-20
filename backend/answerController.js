import Entry from './Answers.js';

export const createEntry = async (req, res) => {
  const { question, feedback, ideal_answer, notes } = req.body;

  try {
    const newEntry = await Entry.create({
      userId: req.auth.userId,
      username: req.auth.sessionClaims?.username,
      question,
      feedback,
      ideal_answer,
      notes,
    });
    res.status(201).json(newEntry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getEntriesByUser = async (req, res) => {
  try {
    const entries = await Entry.find({ userId: req.auth.userId }).sort({ datetime: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateEntryNotes = async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;

  try {
    const updated = await Entry.findByIdAndUpdate(
      id,
      { notes },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
