from __future__ import annotations

from pathlib import Path

from huey import SqliteHuey


def test_sqlite_huey_queue_survives_process_reopen(tmp_path: Path) -> None:
    queue_path = tmp_path / "queue.sqlite3"
    first = SqliteHuey("recovery-test", filename=str(queue_path), results=True)

    @first.task()
    def add(left: int, right: int) -> int:
        return left + right

    result = add(2, 3)
    assert first.pending_count() == 1

    reopened = SqliteHuey("recovery-test", filename=str(queue_path), results=True)
    assert reopened.pending_count() == 1

    task = first.dequeue()
    assert task is not None
    assert first.execute(task) == 5
    assert result.get(blocking=True, timeout=1) == 5
    assert first.pending_count() == 0
