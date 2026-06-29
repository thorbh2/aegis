"""
Tests for AEGIS (direct runner). Web + LLM assessment mocked.

Run with:  python -m pytest -v
"""

import json
from pathlib import Path

CONTRACT = str(Path(__file__).resolve().parents[1] / "contracts" / "aegis.py")

GEN = 10 ** 18
OFFERED, ACTIVE, PAID, EXPIRED = 0, 1, 2, 3

URL = "https://example.com/flight/AB123"
TRIGGER = "Triggered if the flight status reads CANCELLED."


def _offer(c, vm, uw, coverage=10 * GEN, premium=1 * GEN,
           title="Flight delay cover", trigger=TRIGGER, url=URL):
    vm.sender = uw
    vm.value = coverage
    pid = c.offer_policy(title, trigger, url, str(premium))
    vm.value = 0
    return pid


def _buy(c, vm, holder, pid, premium=1 * GEN):
    vm.sender = holder
    vm.value = premium
    c.buy_policy(pid)
    vm.value = 0


# ----------------------------------------------------------------- offer
def test_offer_escrows_coverage(deploy, direct_vm, direct_alice):
    c = deploy(CONTRACT)
    pid = _offer(c, direct_vm, direct_alice, coverage=10 * GEN, premium=GEN)
    assert pid == 0
    p = c.get_policy(0)
    assert p["status"] == OFFERED
    assert p["coverage"] == str(10 * GEN)
    assert p["premium"] == str(GEN)


def test_offer_requires_coverage(deploy, direct_vm, direct_alice):
    c = deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 0
    with direct_vm.expect_revert("coverage"):
        c.offer_policy("t", TRIGGER, URL, str(GEN))


def test_offer_requires_url(deploy, direct_vm, direct_alice):
    c = deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = GEN
    with direct_vm.expect_revert("data source URL"):
        c.offer_policy("t", TRIGGER, "  ", str(GEN))
    direct_vm.value = 0


# ----------------------------------------------------------------- buy
def test_buy_activates(deploy, direct_vm, direct_alice, direct_bob):
    c = deploy(CONTRACT)
    pid = _offer(c, direct_vm, direct_alice)
    _buy(c, direct_vm, direct_bob, pid)
    assert c.get_policy(0)["status"] == ACTIVE


def test_underwriter_cannot_buy(deploy, direct_vm, direct_alice):
    c = deploy(CONTRACT)
    pid = _offer(c, direct_vm, direct_alice, premium=GEN)
    direct_vm.sender = direct_alice
    direct_vm.value = GEN
    with direct_vm.expect_revert("underwriter cannot buy"):
        c.buy_policy(pid)
    direct_vm.value = 0


def test_buy_must_pay_exact_premium(deploy, direct_vm, direct_alice, direct_bob):
    c = deploy(CONTRACT)
    pid = _offer(c, direct_vm, direct_alice, premium=GEN)
    direct_vm.sender = direct_bob
    direct_vm.value = 2 * GEN
    with direct_vm.expect_revert("exact premium"):
        c.buy_policy(pid)
    direct_vm.value = 0


# ----------------------------------------------------------------- claim (mocked)
def test_claim_triggered_pays_holder(deploy, direct_vm, direct_alice, direct_bob):
    c = deploy(CONTRACT)
    pid = _offer(c, direct_vm, direct_alice)
    _buy(c, direct_vm, direct_bob, pid)
    direct_vm.mock_web(r"example\.com", {"status": 200, "body": "Flight AB123 status: CANCELLED"})
    direct_vm.mock_llm(r"trigger condition", json.dumps({"triggered": True, "note": "status cancelled"}))
    direct_vm.sender = direct_bob
    c.file_claim(pid)
    p = c.get_policy(0)
    assert p["status"] == PAID
    assert "cancelled" in p["assessment"]


def test_claim_not_triggered_returns_to_underwriter(deploy, direct_vm, direct_alice, direct_bob):
    c = deploy(CONTRACT)
    pid = _offer(c, direct_vm, direct_alice)
    _buy(c, direct_vm, direct_bob, pid)
    direct_vm.mock_web(r"example\.com", {"status": 200, "body": "Flight AB123 status: ON TIME"})
    direct_vm.mock_llm(r"trigger condition", json.dumps({"triggered": False, "note": "on time"}))
    direct_vm.sender = direct_bob
    c.file_claim(pid)
    assert c.get_policy(0)["status"] == EXPIRED


def test_cannot_claim_inactive(deploy, direct_vm, direct_alice):
    c = deploy(CONTRACT)
    _offer(c, direct_vm, direct_alice)
    with direct_vm.expect_revert("not active"):
        c.file_claim(0)


def test_unknown_policy_reverts(deploy, direct_vm):
    c = deploy(CONTRACT)
    with direct_vm.expect_revert("no such policy"):
        c.get_policy(0)
