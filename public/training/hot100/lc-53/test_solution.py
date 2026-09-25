"""Original local checks enumerate every nonempty interval as an oracle."""
import itertools
import unittest
from solution import Solution


class MaxSubarrayTests(unittest.TestCase):
    def test_original_examples_and_nonempty_requirement(self):
        for nums, expected in [([-4, 6, -2, 5, -9, 3], 9), ([-8, -3, -11], -3), ([0], 0), ([-9], -9), ([4, -100, 5], 5)]:
            with self.subTest(nums=nums):
                self.assertEqual(Solution().maxSubArray(nums), expected)

    def test_small_exhaustive_lists(self):
        solver = Solution()
        for length in range(1, 6):
            for values in itertools.product((-2, 0, 3), repeat=length):
                nums = list(values)
                expected = max(sum(nums[start:stop]) for start in range(length) for stop in range(start + 1, length + 1))
                with self.subTest(nums=nums):
                    self.assertEqual(solver.maxSubArray(nums), expected)


if __name__ == '__main__':
    unittest.main()
