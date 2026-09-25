"""Career OS original reference: reverse existing node links iteratively."""
from __future__ import annotations


class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


class Solution:
    def reverseList(self, head: ListNode | None) -> ListNode | None:
        previous = None
        current = head
        while current is not None:
            original_next = current.next
            current.next = previous
            previous = current
            current = original_next
        return previous
