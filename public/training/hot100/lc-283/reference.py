"""Career OS original reference: stable in-place compaction."""

class Solution:
    def moveZeroes(self, nums: list[int]) -> None:
        write = 0
        for value in nums:
            if value != 0:
                nums[write] = value
                write += 1
        for index in range(write, len(nums)):
            nums[index] = 0
