"""Original local checks; passing these does not mean LeetCode Accepted."""
import itertools
import unittest
from solution import Solution


class TwoSumTests(unittest.TestCase):
    def check_pair(self, nums, target):
        before = nums[:]
        answer = Solution().twoSum(nums, target)
        self.assertEqual(len(answer), 2)
        i, j = answer
        self.assertIsInstance(i, int)
        self.assertIsInstance(j, int)
        self.assertTrue(0 <= i < len(nums) and 0 <= j < len(nums))
        self.assertNotEqual(i, j)
        self.assertEqual(nums[i] + nums[j], target)
        self.assertEqual(nums, before)

    def test_original_examples_and_duplicate_values(self):
        for nums, target in [([6, -2, 9, 4], 7), ([8, 8, 3], 16), ([-5, 5, 11], 0), ([0, 0], 0)]:
            with self.subTest(nums=nums, target=target):
                self.check_pair(nums, target)

    def test_small_exhaustive_domain_accepts_any_valid_pair(self):
        for values in itertools.product((-2, 0, 3), repeat=4):
            possible = {values[i] + values[j] for i in range(4) for j in range(i + 1, 4)}
            for target in possible:
                with self.subTest(values=values, target=target):
                    self.check_pair(list(values), target)

    def test_no_state_leaks_between_calls(self):
        solver = Solution()
        solver.twoSum([2, 6], 8)
        answer = solver.twoSum([9, 4, 9], 18)
        self.assertEqual(set(answer), {0, 2})


if __name__ == '__main__':
    unittest.main()
