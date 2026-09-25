"""Original local checks use independent explicit interval sums."""
import itertools
import unittest
from solution import Solution


def count_intervals(nums, target):
    return sum(sum(nums[start:stop]) == target
               for start in range(len(nums)) for stop in range(start + 1, len(nums) + 1))


class PrefixCountTests(unittest.TestCase):
    def test_zero_prefixes_negative_numbers_and_empty_extension(self):
        cases = [([3, -1, -2, 3], 3, 3), ([0, 0, 0], 0, 6), ([2, 2, 2], 4, 2), ([], 0, 0), ([-2, -2], -4, 1)]
        for nums, target, expected in cases:
            with self.subTest(nums=nums, target=target):
                self.assertEqual(Solution().subarraySum(nums, target), expected)

    def test_small_exhaustive_lists(self):
        solver = Solution()
        for length in range(6):
            for values in itertools.product((-1, 0, 2), repeat=length):
                nums = list(values)
                for target in range(-2, 4):
                    with self.subTest(nums=nums, target=target):
                        self.assertEqual(solver.subarraySum(nums, target), count_intervals(nums, target))


if __name__ == '__main__':
    unittest.main()
