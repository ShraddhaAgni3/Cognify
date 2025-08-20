import express from 'express';
import { requireAuth } from './ClerkAuth.js';
import {
  createEntry,
  getEntriesByUser,
  updateEntryNotes
} from '../controllers/entryController.js';

const router = express.Router();

router.post('/', requireAuth, createEntry);
router.get('/', requireAuth, getEntriesByUser);
router.patch('/:id/notes', requireAuth, updateEntryNotes);

export default router;
