"""Original local checks verify values, node identity, and cycle avoidance."""
import unittest
from solution import ListNode, Solution


def make_chain(values):
    nodes = [ListNode(value) for value in values]
    for first, second in zip(nodes, nodes[1:]):
        first.next = second
    return nodes


class ReverseListTests(unittest.TestCase):
    def test_empty_and_single_node(self):
        self.assertIsNone(Solution().reverseList(None))
        node = ListNode(9)
        self.assertIs(Solution().reverseList(node), node)
        self.assertIsNone(node.next)

    def test_reverses_existing_nodes_without_replacing_them(self):
        nodes = make_chain([7, 2, -4, 2])
        head = Solution().reverseList(nodes[0])
        for expected in reversed(nodes):
            self.assertIs(head, expected)
            head = head.next
        self.assertIsNone(head)
        self.assertEqual([node.val for node in nodes], [7, 2, -4, 2])

    def test_reversing_twice_restores_connections(self):
        nodes = make_chain([1, 4, 9, 16, 25])
        solver = Solution()
        head = solver.reverseList(solver.reverseList(nodes[0]))
        for node in nodes:
            self.assertIs(head, node)
            head = head.next
        self.assertIsNone(head)

    def test_long_chain_does_not_need_recursive_calls(self):
        nodes = make_chain(range(1800))
        head = Solution().reverseList(nodes[0])
        for expected in reversed(nodes):
            self.assertIs(head, expected)
            head = head.next
        self.assertIsNone(head)


if __name__ == '__main__':
    unittest.main()
