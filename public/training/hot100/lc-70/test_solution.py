"""Original local checks count placements of two-step moves combinatorially."""
import math
import unittest
from solution import Solution


class StaircaseTests(unittest.TestCase):
    def test_original_examples_and_initial_values(self):
        for n, expected in [(1, 1), (2, 2), (6, 13), (8, 34)]:
            with self.subTest(n=n):
                self.assertEqual(Solution().climbStairs(n), expected)

    def test_complete_declared_input_domain_against_combinatorics(self):
        solver = Solution()
        for n in range(1, 46):
            # k two-step moves leave n-2k one-step moves: choose their order
            # among n-k total moves, independent of the recurrence solution.
            expected = sum(math.comb(n - k, k) for k in range(n // 2 + 1))
            with self.subTest(n=n):
                result = solver.climbStairs(n)
                self.assertIsInstance(result, int)
                self.assertEqual(result, expected)


if __name__ == '__main__':
    unittest.main()
