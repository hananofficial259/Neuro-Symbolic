import asyncio
from typing import AsyncGenerator, Dict, List


class ScanEventHub:
    """
    Manages in-memory pub/sub queues for Server-Sent Events (SSE).
    Allows client browsers to receive live stage transitions and execution logs.
    """

    def __init__(self):
        self._subscribers: Dict[str, List[asyncio.Queue]] = {}

    def subscribe(self, scan_id: str) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue()
        if scan_id not in self._subscribers:
            self._subscribers[scan_id] = []
        self._subscribers[scan_id].append(queue)
        return queue

    def unsubscribe(self, scan_id: str, queue: asyncio.Queue):
        if scan_id in self._subscribers:
            if queue in self._subscribers[scan_id]:
                self._subscribers[scan_id].remove(queue)
            if not self._subscribers[scan_id]:
                del self._subscribers[scan_id]

    async def publish_event(self, scan_id: str, event_type: str, data: dict):
        if scan_id in self._subscribers:
            payload = {
                "event": event_type,
                "data": data,
            }
            for q in self._subscribers[scan_id]:
                await q.put(payload)


event_hub = ScanEventHub()
