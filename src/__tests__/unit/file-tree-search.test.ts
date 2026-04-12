import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { collectExpandedDirectoryPaths, filterFileTree } from '../../lib/file-tree-search';
import type { FileTreeNode } from '../../types';

const SAMPLE_TREE: FileTreeNode[] = [
  {
    name: 'TianTian',
    path: '/repo/TianTian',
    type: 'directory',
    children: [
      {
        name: 'graphs',
        path: '/repo/TianTian/graphs',
        type: 'directory',
        children: [
          {
            name: 'graph-builder.ts',
            path: '/repo/TianTian/graphs/graph-builder.ts',
            type: 'file',
            extension: 'ts',
          },
        ],
      },
      {
        name: 'notes.txt',
        path: '/repo/TianTian/notes.txt',
        type: 'file',
        extension: 'txt',
      },
    ],
  },
  {
    name: '.codex',
    path: '/repo/.codex',
    type: 'directory',
    children: [
      {
        name: 'graph-config.json',
        path: '/repo/.codex/graph-config.json',
        type: 'file',
        extension: 'json',
      },
    ],
  },
];

describe('file tree search helpers', () => {
  it('keeps only matching branches and matched files', () => {
    const filtered = filterFileTree(SAMPLE_TREE, 'graph');

    assert.equal(filtered.length, 2);
    assert.equal(filtered[0]?.name, 'TianTian');
    assert.equal(filtered[0]?.children?.[0]?.name, 'graphs');
    assert.equal(filtered[0]?.children?.[0]?.children?.[0]?.name, 'graph-builder.ts');
    assert.equal(filtered[0]?.children?.length, 1);

    assert.equal(filtered[1]?.name, '.codex');
    assert.equal(filtered[1]?.children?.[0]?.name, 'graph-config.json');
  });

  it('returns all ancestor directories that should auto-expand for search results', () => {
    const filtered = filterFileTree(SAMPLE_TREE, 'graph');
    const expanded = collectExpandedDirectoryPaths(filtered);

    assert.deepEqual(
      [...expanded].sort(),
      ['/repo/.codex', '/repo/TianTian', '/repo/TianTian/graphs'].sort(),
    );
  });

  it('does not auto-expand empty matching directories', () => {
    const filtered: FileTreeNode[] = [
      {
        name: 'graph',
        path: '/repo/graph',
        type: 'directory',
        children: [],
      },
    ];

    const expanded = collectExpandedDirectoryPaths(filtered);
    assert.equal(expanded.size, 0);
  });
});
