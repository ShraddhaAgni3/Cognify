import { ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';

export const requireAuth = ClerkExpressWithAuth({
  onError: (err, req, res, next) => {
    res.status(401).json({ error: 'Unauthorized', details: err.message });
  }
});
