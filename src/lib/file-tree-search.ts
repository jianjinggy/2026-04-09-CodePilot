import type { FileTreeNode } from '@/types';

function containsMatch(node: FileTreeNode, query: string): boolean {
  const q = query.toLowerCase();
  if (node.name.toLowerCase().includes(q)) return true;
  if (node.children) {
    return node.children.some((child) => containsMatch(child, q));
  }
  return false;
}

export function filterFileTree(nodes: FileTreeNode[], query: string): FileTreeNode[] {
  if (!query) return nodes;

  return nodes
    .filter((node) => containsMatch(node, query))
    .map((node) => ({
      ...node,
      children: node.children ? filterFileTree(node.children, query) : undefined,
    }));
}

export function collectExpandedDirectoryPaths(nodes: FileTreeNode[]): Set<string> {
  const expanded = new Set<string>();

  const visit = (node: FileTreeNode) => {
    if (node.type !== 'directory' || !node.children?.length) return;
    expanded.add(node.path);
    node.children.forEach(visit);
  };

  nodes.forEach(visit);
  return expanded;
}
