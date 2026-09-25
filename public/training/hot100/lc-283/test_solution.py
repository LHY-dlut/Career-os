"""Original local checks; no official/private judge cases are included."""
import itertools
import unittest
from solution import Solution


class MoveZeroesTests(unittest.TestCase):
    def check_case(self, values):
        nums = list(values)
        identity = id(nums)
        expected = [value for value in values if value != 0] + [0] * values.count(0)
        result = Solution().moveZeroes(nums)
        self.assertIsNone(result)
        self.assertEqual(id(nums), identity)
        self.assertEqual(nums, expected)

    def test_stability_and_boundary_cases(self):
        for values in [[], [0], [7], [0, 0, 0], [4, -1], [0, 5, 0, -3, 7], [2, 0, 2, 0, -2]]:
            with self.subTest(values=values):
                self.check_case(values)

    def test_small_exhaustive_lists(self):
        for length in range(6):
            for values in itertools.product((-1, 0, 2), repeat=length):
                with self.subTest(values=values):
                    self.check_case(list(values))


if __name__ == '__main__':
    unittest.main()
