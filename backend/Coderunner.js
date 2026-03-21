import { exec } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import os from 'os';

const runInSandbox = (command, timeout = 10000) => {
  return new Promise((resolve) => {
    const proc = exec(command, { timeout }, (error, stdout, stderr) => {
      if (error && error.killed) {
        resolve({ stdout: '', stderr: 'Time limit exceeded (10s)', error: true });
      } else {
        resolve({ stdout: stdout || '', stderr: stderr || '', error: !!error });
      }
    });
  });
};

export const runCode = async (req, res) => {
  const { language, code } = req.body;

  if (!code || !language) {
    return res.status(400).json({ error: 'Language and code are required' });
  }

  const tmpDir = os.tmpdir();

  try {
    let result;

    if (language === 'javascript') {
      // Run JS via Node.js
      const filePath = join(tmpDir, `code_${Date.now()}.js`);
      await writeFile(filePath, code);
      result = await runInSandbox(`node ${filePath}`);
      await unlink(filePath).catch(() => {});

    } else if (language === 'python') {
      // Run Python
      const filePath = join(tmpDir, `code_${Date.now()}.py`);
      await writeFile(filePath, code);
      result = await runInSandbox(`python3 ${filePath}`);
      await unlink(filePath).catch(() => {});

    } else {
      return res.json({
        stdout: '',
        stderr: `⚠️ ${language} execution is not supported in the free tier.\n\nSupported languages: JavaScript, Python`,
        error: false
      });
    }

    res.json(result);

  } catch (err) {
    res.status(500).json({ stdout: '', stderr: 'Server error while running code', error: true });
  }
};