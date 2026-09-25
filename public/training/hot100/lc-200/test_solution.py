"""Original local checks use an independent disjoint-set oracle."""
import itertools
import unittest
from solution import Solution


def disjoint_set_count(grid):
    parent = {(r, c): (r, c) for r, row in enumerate(grid) for c, value in enumerate(row) if value == '1'}

    def root(point):
        while parent[point] != point:
            point = parent[point]
        return point

    for r, c in parent:
        for neighbor in ((r + 1, c), (r, c + 1)):
            if neighbor in parent:
                parent[root((r, c))] = root(neighbor)
    return len({root(point) for point in parent})


class IslandTests(unittest.TestCase):
    def test_original_examples_and_empty_extension(self):
        for grid, expected in [([], 0), ([[]], 0), ([['0']], 0), ([['1']], 1), ([list('101'), list('100'), list('011')], 3), ([list('10'), list('01')], 2)]:
            with self.subTest(grid=grid):
                self.assertEqual(Solution().numIslands([row[:] for row in grid]), expected)

    def test_all_small_rectangles_against_union_find(self):
        for cells in itertools.product('01', repeat=6):
            grid = [list(cells[:3]), list(cells[3:])]
            expected = disjoint_set_count(grid)
            with self.subTest(grid=grid):
                self.assertEqual(Solution().numIslands(grid), expected)

    def test_large_connected_patch_avoids_recursion_limit(self):
        self.assertEqual(Solution().numIslands([['1'] * 40 for _ in range(40)]), 1)


if __name__ == '__main__':
    unittest.main()
