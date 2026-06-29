# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""
AEGIS - Parametric Insurance with a Self-Adjudicating Oracle
============================================================
An underwriter opens a policy: they lock a payout in escrow and define a trigger
condition plus a public data URL the contract can read. A policyholder buys
coverage by paying a premium (which goes to the underwriter immediately). When a
claim is filed, the contract reads the live data source and the validator set
agrees (Equivalence Principle) on whether the trigger condition is met. If it is,
the policyholder is paid the coverage from escrow automatically. No adjuster.

Lifecycle:
    OFFERED   -> underwriter funded coverage, premium not yet paid
    ACTIVE    -> policyholder paid premium, coverage in force
    PAID      -> trigger met from live data, holder paid the coverage
    EXPIRED   -> claim assessed, trigger NOT met, escrow returned to underwriter
"""

from genlayer import *
from dataclasses import dataclass
import json
import typing


STATUS_OFFERED = 0
STATUS_ACTIVE = 1
STATUS_PAID = 2
STATUS_EXPIRED = 3


@allow_storage
@dataclass
class Policy:
    underwriter: Address
    holder: Address
    title: str
    trigger: str
    data_url: str
    premium: u256
    coverage: u256
    status: u8
    assessment: str


class Aegis(gl.Contract):
    policies: DynArray[Policy]

    def __init__(self) -> None:
        pass

    @gl.public.write.payable
    def offer_policy(self, title: str, trigger: str, data_url: str, premium_wei: str) -> int:
        """Underwriter locks the coverage (the GEN sent here) and names the
        premium a holder must pay to activate it."""
        coverage = gl.message.value
        if coverage == u256(0):
            raise gl.vm.UserError("coverage must be funded with GEN")
        if len(trigger.strip()) == 0:
            raise gl.vm.UserError("a trigger condition is required")
        if len(data_url.strip()) == 0:
            raise gl.vm.UserError("a data source URL is required")
        try:
            premium = u256(int(premium_wei))
        except (ValueError, TypeError):
            raise gl.vm.UserError("premium must be an integer (wei)")
        p = self.policies.append_new_get()
        p.underwriter = gl.message.sender_address
        p.holder = Address(bytes(20))
        p.title = title
        p.trigger = trigger
        p.data_url = data_url
        p.premium = premium
        p.coverage = coverage
        p.status = u8(STATUS_OFFERED)
        p.assessment = ""
        return len(self.policies) - 1

    @gl.public.write.payable
    def buy_policy(self, policy_id: int) -> None:
        """Holder pays the exact premium; it transfers to the underwriter and
        coverage becomes active."""
        p = self._get(policy_id)
        if p.status != STATUS_OFFERED:
            raise gl.vm.UserError("policy is not available")
        if gl.message.sender_address == p.underwriter:
            raise gl.vm.UserError("underwriter cannot buy their own policy")
        if gl.message.value != p.premium:
            raise gl.vm.UserError("you must pay the exact premium")
        p.holder = gl.message.sender_address
        p.status = u8(STATUS_ACTIVE)
        # premium goes straight to the underwriter
        self._pay(p.underwriter, p.premium)

    @gl.public.write
    def file_claim(self, policy_id: int) -> None:
        """Assess a claim. The contract reads the data source and the validator
        set agrees whether the trigger condition is met."""
        p = self._get(policy_id)
        if p.status != STATUS_ACTIVE:
            raise gl.vm.UserError("policy is not active")

        url = p.data_url
        trigger = p.trigger

        def leader_fn() -> str:
            page = gl.nondet.web.get(url).body.decode("utf-8")[:6000]
            prompt = (
                f"Insurance trigger condition: {trigger}\n\n"
                f"Live data source content:\n{page}\n\n"
                "Based ONLY on the data above, is the trigger condition met right "
                'now? Reply with ONLY JSON: {"triggered": true} or '
                '{"triggered": false}, plus a short "note".'
            )
            return gl.nondet.exec_prompt(prompt)

        def validator_fn(leader_res) -> bool:
            if not isinstance(leader_res, gl.vm.Return):
                return False
            return self._triggered_of(leader_res.calldata)[0] == self._triggered_of(leader_fn())[0]

        verdict = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        triggered, note = self._triggered_of(verdict)
        p.assessment = note[:400]

        if triggered:
            p.status = u8(STATUS_PAID)
            self._pay(p.holder, p.coverage)
        else:
            p.status = u8(STATUS_EXPIRED)
            self._pay(p.underwriter, p.coverage)

    # ------------------------------------------------------------------ views
    @gl.public.view
    def get_policy_count(self) -> int:
        return len(self.policies)

    @gl.public.view
    def get_policy(self, policy_id: int) -> dict:
        p = self._get(policy_id)
        return {
            "underwriter": p.underwriter.as_hex,
            "holder": p.holder.as_hex,
            "title": p.title,
            "trigger": p.trigger,
            "data_url": p.data_url,
            "premium": str(p.premium),
            "coverage": str(p.coverage),
            "status": int(p.status),
            "assessment": p.assessment,
        }

    # -------------------------------------------------------------- internals
    def _get(self, policy_id: int) -> Policy:
        if policy_id < 0 or policy_id >= len(self.policies):
            raise gl.vm.UserError("no such policy")
        return self.policies[policy_id]

    def _triggered_of(self, verdict: typing.Any) -> tuple:
        data = verdict
        if isinstance(data, str):
            data = self._extract_json(data)
        if not isinstance(data, dict):
            return (False, "")
        raw = data.get("triggered", None)
        note = str(data.get("note", ""))
        if isinstance(raw, bool):
            return (raw, note)
        if isinstance(raw, str):
            return (raw.strip().lower() == "true", note)
        return (False, note)

    def _extract_json(self, text: str) -> typing.Any:
        try:
            return json.loads(text)
        except (ValueError, TypeError):
            pass
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except (ValueError, TypeError):
                return None
        return None

    def _pay(self, recipient: Address, amount: u256) -> None:
        if amount == u256(0):
            return
        _Payee(recipient).emit_transfer(value=amount)


@gl.evm.contract_interface
class _Payee:
    class View:
        pass

    class Write:
        pass
