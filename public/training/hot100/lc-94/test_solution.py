"""Original local checks include a non-BST and a deep skewed tree."""
import unittest
from solution import TreeNode, Solution


class InorderTests(unittest.TestCase):
    def test_empty_and_single_node(self):
        self.assertEqual(Solution().inorderTraversal(None), [])
        self.assertEqual(Solution().inorderTraversal(TreeNode(-7)), [-7])

    def test_original_example_and_preserves_tree(self):
        a, b, c, d = TreeNode(5), TreeNode(2), TreeNode(8), TreeNode(6)
        a.left, a.right, c.left = b, c, d
        nodes = [a, b, c, d]
        before = [(node.val, node.left, node.right) for node in nodes]
        self.assertEqual(Solution().inorderTraversal(a), [2, 5, 6, 8])
        self.assertEqual([(node.val, node.left, node.right) for node in nodes], before)

    def test_values_must_not_be_sorted_or_deduplicated(self):
        root = TreeNode(2, TreeNode(9), TreeNode(2, TreeNode(-1)))
        self.assertEqual(Solution().inorderTraversal(root), [9, 2, -1, 2])

    def test_deep_tree_uses_explicit_stack(self):
        root = None
        for value in range(1500):
            root = TreeNode(value, root)
        self.assertEqual(Solution().inorderTraversal(root), list(range(1500)))


if __name__ == '__main__':
    unittest.main()
