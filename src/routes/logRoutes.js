import express from 'express';
import path from 'path';
import fs from 'fs';

const router = express.Router();

router.get('/raw-logs', (req, res) => {
  const secret = req.query.monitor_token;

  const token = process.env.MONITOR_TOKEN || 'wcm_monitor';

  if (secret !== token) {
    return res.status(401).json({ message: 'Unauthorized access' });
  }

  const logPath = path.join(process.cwd(), 'logs/error.log');

  if (fs.existsSync(logPath)) {
    res.setHeader('Content-Type', 'text/plain');
    return res.sendFile(logPath);
  } else {
    return res.status(404).send('No logs recorded yet.');
  }
});

export default router;
