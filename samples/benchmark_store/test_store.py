import pytest

try:
    from store import calculate_discounted_total, process_payment_debit
except ImportError:
    from samples.benchmark_store.store import calculate_discounted_total, process_payment_debit


def test_valid_discount():
    total = calculate_discounted_total(100.0, 20.0)
    assert total == 80.0


def test_valid_debit():
    new_bal = process_payment_debit(100.0, 30.0)
    assert new_bal == 70.0


def test_overdraft_assertion_fails_on_bug():
    """
    This test asserts that debiting 150 from 100 should not result in negative balance.
    Because store.py has a bug, this test will fail as expected for our benchmark.
    """
    new_bal = process_payment_debit(100.0, 150.0)
    # Correct business logic expects new_bal >= 0 or an exception
    assert new_bal >= 0.0, f"Expected non-negative balance, got {new_bal}"
