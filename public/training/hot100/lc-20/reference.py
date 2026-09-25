"""Career OS original reference: match each closing bracket to the stack top."""

class Solution:
    def isValid(self, s: str) -> bool:
        opening_for = {')': '(', ']': '[', '}': '{'}
        stack = []
        for character in s:
            if character in '([{':
                stack.append(character)
            elif not stack or stack.pop() != opening_for.get(character):
                return False
        return not stack
