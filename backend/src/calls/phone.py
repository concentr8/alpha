"""Small helper so phone numbers never appear in full in logs.

Purpose:  rule 5 of docs/plans/call-feature.md: a phone number is personal
          data. Anything that is logged goes through `mask_phone` first.
Called by: service.py
"""


def mask_phone(phone_e164: str) -> str:
    """Hide all digits except the last two: "+15555550100" -> "+*********00"."""
    if len(phone_e164) < 4:
        return "*" * len(phone_e164)
    return "+" + "*" * (len(phone_e164) - 3) + phone_e164[-2:]
