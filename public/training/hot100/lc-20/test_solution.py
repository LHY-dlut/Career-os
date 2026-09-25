"""Original local checks compare with repeated adjacent-pair elimination."""
import itertools
import unittest
from solution import Solution


def eliminate_pairs(text):
    while True:
        shorter = text.replace('()', '').replace('[]', '').replace('{}', '')
        if shorter == text:
            return shorter == ''
        text = shorter


class BracketTests(unittest.TestCase):
    def test_original_examples_and_boundaries(self):
        for text, expected in [('([]{})', True), ('[({)]}', False), ('', True), (')', False), ('(((', False), ('{}[]()', True), ('([)]', False)]:
            with self.subTest(text=text):
                self.assertEqual(Solution().isValid(text), expected)

    def test_exhaustive_short_bracket_strings(self):
        solver = Solution()
        for length in range(5):
            for letters in itertools.product('()[]{}', repeat=length):
                text = ''.join(letters)
                with self.subTest(text=text):
                    self.assertEqual(solver.isValid(text), eliminate_pairs(text))


if __name__ == '__main__':
    unittest.main()
