"""Original local checks compare against direct substring enumeration."""
import itertools
import unittest
from solution import Solution


def enumerate_longest(text):
    best = 0
    for start in range(len(text)):
        for stop in range(start + 1, len(text) + 1):
            piece = text[start:stop]
            if len(set(piece)) == len(piece):
                best = max(best, len(piece))
    return best


class UniqueWindowTests(unittest.TestCase):
    def test_examples_and_left_boundary_regression(self):
        for text, expected in [('', 0), ('abcaef', 5), ('abba', 2), ('zzzz', 1), ('甲乙甲丙丁', 4), ('a a!', 3)]:
            with self.subTest(text=text):
                self.assertEqual(Solution().lengthOfLongestSubstring(text), expected)

    def test_small_exhaustive_strings(self):
        solver = Solution()
        for length in range(6):
            for letters in itertools.product('abc', repeat=length):
                text = ''.join(letters)
                with self.subTest(text=text):
                    self.assertEqual(solver.lengthOfLongestSubstring(text), enumerate_longest(text))


if __name__ == '__main__':
    unittest.main()
