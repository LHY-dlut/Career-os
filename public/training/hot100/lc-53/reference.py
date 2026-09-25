"""Career OS original reference: separate ending-here and global optima."""

class Solution:
    def maxSubArray(self, nums: list[int]) -> int:
        if not nums:
            raise ValueError("A nonempty list is required")
        ending_here = best = nums[0]
        for index in range(1, len(nums)):
            value = nums[index]
            ending_here = max(value, ending_here + value)
            best = max(best, ending_here)
        return best
