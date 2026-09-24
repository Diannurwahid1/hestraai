from app.schemas.chat import ChatRequest, OrchestrationPlan


class Orchestrator:
    def plan_signal(self, signal_type: str, profile: str = "senior") -> OrchestrationPlan:
        tools = {
            "operational_financial_divergence": ["financial", "mining", "commodity", "peer", "contradiction"],
            "peer_divergence": ["financial", "peer", "contradiction"],
            "commodity_financial_divergence": ["financial", "commodity", "peer", "contradiction"],
        }.get(signal_type, ["financial", "contradiction"])
        return OrchestrationPlan(intent="investigate_divergence", depth="deep", agents=tools,
                                 need_mentor=profile == "junior", need_contradiction_check=True)

    def plan(self, request: ChatRequest) -> OrchestrationPlan:
        message = request.message.lower()
        context = request.context_id or ""
        if "sig_" in context:
            for kind in ("operational_financial_divergence", "commodity_financial_divergence", "peer_divergence"):
                if kind in context:
                    return self.plan_signal(kind, request.profile)
        is_deep = bool(request.context_id and "sig_" in request.context_id) or any(term in message for term in ("why", "investigate", "divergence", "evidence", "mengapa", "bukti", "selidiki"))
        agents = ["financial", "commodity"]
        if is_deep:
            agents += ["mining", "peer", "contradiction"]
        return OrchestrationPlan(intent="investigate_divergence" if is_deep else "research_summary", depth="deep" if is_deep else "standard", agents=agents, need_mentor=request.profile == "junior", need_contradiction_check=is_deep)
