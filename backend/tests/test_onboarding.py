import pytest
from pydantic import ValidationError

from app.api.onboarding import OnboardingInput


def valid_profile(**changes):
    return OnboardingInput(**({"name": "Analyst", "plan": "analyst", "level": "beginner",
        "role": "Equity Analyst", "focus_tickers": ["antm", "INCO"],
        "research_goal": "Understand nickel margins", "language": "English"} | changes))


def test_onboarding_normalizes_verified_focus_and_rejects_unverified_tickers():
    assert valid_profile().focus_tickers == ["ANTM", "INCO"]
    with pytest.raises(ValidationError):
        valid_profile(focus_tickers=["NOTREAL"])


def test_onboarding_rejects_blank_identity_and_unlisted_plan():
    with pytest.raises(ValidationError):
        valid_profile(name="   ")
    with pytest.raises(ValidationError):
        valid_profile(plan="paid-live")
