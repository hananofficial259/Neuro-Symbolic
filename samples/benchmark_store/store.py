"""
Benchmark E-Commerce Sample Module.
Contains checkout calculation logic with intentional edge-case bugs for invariant verification.
"""
from decimal import Decimal


def calculate_discounted_total(subtotal: float, discount_percentage: float) -> float:
    """
    Calculates the final cart total after discount.
    Known Bug: Allows discount > 100% or negative discounts, resulting in negative total or price inflation.
    """
    # Intentional Bug: No boundary validation on discount_percentage
    discount_amount = subtotal * (discount_percentage / 100.0)
    final_total = subtotal - discount_amount
    return round(final_total, 2)


def process_payment_debit(current_balance: float, debit_amount: float) -> float:
    """
    Debits an account balance.
    Known Bug: Lacks balance check; allows account balance to dip below zero.
    """
    # Intentional Bug: missing overdraft protection
    new_balance = current_balance - debit_amount
    return round(new_balance, 2)


def execute_shell_maintenance_command(cmd: str):
    """
    Known Security Vulnerability: direct os.system command injection.
    """
    import os
    os.system(cmd)
