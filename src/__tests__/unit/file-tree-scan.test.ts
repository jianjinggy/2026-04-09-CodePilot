import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { scanDirectory } from '../../lib/files';

describe('scanDirectory hidden directory visibility', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codepilot-file-tree-'));

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('shows allowed hidden directories and their contents', async () => {
    fs.mkdirSync(path.join(tmpDir, '.claude', 'commands'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.agents', 'skills'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.codex'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, '.secrets'), { recursive: true });

    fs.writeFileSync(path.join(tmpDir, '.claude', 'settings.json'), '{}\n');
    fs.writeFileSync(path.join(tmpDir, '.claude', '.credentials'), 'token\n');
    fs.writeFileSync(path.join(tmpDir, '.agents', '.skill-lock.json'), '{}\n');
    fs.writeFileSync(path.join(tmpDir, '.codex', 'config.toml'), 'model = "gpt-5"\n');
    fs.writeFileSync(path.join(tmpDir, '.secrets', 'hidden.txt'), 'nope\n');

    const tree = await scanDirectory(tmpDir, 3);
    const names = tree.map((node) => node.name);

    assert.deepEqual(names, ['.agents', '.claude', '.codex']);

    const claudeNode = tree.find((node) => node.name === '.claude');
    assert.ok(claudeNode);
    assert.equal(claudeNode.type, 'directory');
    assert.ok(claudeNode.children?.some((child) => child.name === 'settings.json'));
    assert.ok(claudeNode.children?.some((child) => child.name === '.credentials'));

    const agentsNode = tree.find((node) => node.name === '.agents');
    assert.ok(agentsNode);
    assert.equal(agentsNode.type, 'directory');
    assert.ok(agentsNode.children?.some((child) => child.name === '.skill-lock.json'));
  });
});
