"""Career OS original reference: roll the two preceding staircase counts."""

class Solution:
    def climbStairs(self, n: int) -> int:
        if n < 1:
            raise ValueError("n must be positive")
        before_previous, previous = 1, 1
        for _ in range(2, n + 1):
            before_previous, previous = previous, before_previous + previous
        return previous
