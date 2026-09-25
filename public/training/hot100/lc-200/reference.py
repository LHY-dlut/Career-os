"""Career OS original reference: visit each four-connected land component."""
from typing import List


class Solution:
    def numIslands(self, grid: List[List[str]]) -> int:
        if not grid or not grid[0]:
            return 0
        rows, columns = len(grid), len(grid[0])
        visited = set()
        islands = 0
        for row in range(rows):
            for column in range(columns):
                if grid[row][column] != '1' or (row, column) in visited:
                    continue
                islands += 1
                visited.add((row, column))
                stack = [(row, column)]
                while stack:
                    r, c = stack.pop()
                    for nr, nc in ((r - 1, c), (r + 1, c), (r, c - 1), (r, c + 1)):
                        if 0 <= nr < rows and 0 <= nc < columns and grid[nr][nc] == '1' and (nr, nc) not in visited:
                            visited.add((nr, nc))
                            stack.append((nr, nc))
        return islands
