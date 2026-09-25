"""Career OS original reference: count earlier prefix sums."""
from typing import List


class Solution:
    def subarraySum(self, nums: List[int], k: int) -> int:
        frequency = {0: 1}
        prefix = 0
        count = 0
        for value in nums:
            prefix += value
            count += frequency.get(prefix - k, 0)
            frequency[prefix] = frequency.get(prefix, 0) + 1
        return count
