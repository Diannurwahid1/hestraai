from app.agents.orchestrator import Orchestrator
from app.schemas.chat import ChatRequest


def test_deep_plan_for_divergence():
    plan = Orchestrator().plan(ChatRequest(message="Why did margins diverge?", context_id="inco", profile="senior"))
    assert plan.depth == "deep"
    assert "contradiction" in plan.agents
    assert plan.need_mentor is False


def test_junior_enables_mentor():
    plan = Orchestrator().plan(ChatRequest(message="Summarize ANTM", profile="junior"))
    assert plan.need_mentor is True

