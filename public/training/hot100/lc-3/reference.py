"""Career OS original reference: a window with a monotone left boundary."""

class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        last_seen = {}
        left = 0
        longest = 0
        for right, character in enumerate(s):
            if character in last_seen:
                left = max(left, last_seen[character] + 1)
            last_seen[character] = right
            longest = max(longest, right - left + 1)
        return longest
