from fastapi import APIRouter, Depends
from app.dependencies import get_sectors
from app.schemas.common import Envelope, ResponseMeta
from app.services.company_service import CompanyService
from app.services.sectors_client import SectorsClient

router = APIRouter(tags=["companies"])


@router.get("/companies/{ticker}")
async def company(ticker: str, sectors: SectorsClient = Depends(get_sectors)):
    data, source, cached = await CompanyService(sectors).get_company(ticker)
    return Envelope(data=data, meta=ResponseMeta(source=source, cached=cached))


@router.get("/companies/{ticker}/peers")
async def peers(ticker: str, sectors: SectorsClient = Depends(get_sectors)):
    company_data, _, cached = await CompanyService(sectors).get_company(ticker)
    return Envelope(data=company_data["peers"], meta=ResponseMeta(source="sectors", cached=cached))


@router.get("/companies/{ticker}/context-graph")
async def context_graph(ticker: str, sectors: SectorsClient = Depends(get_sectors)):
    ticker = ticker.upper()
    company_data, source, cached = await CompanyService(sectors).get_company(ticker)
    nodes = [{"id": ticker.lower(), "type": "company", "label": company_data["name"], "detail": ticker}]
    mining = company_data.get("mining") or {}
    if mining:
        nodes.append({"id": "mining", "type": "mining", "label": mining["name"], "detail": mining.get("operation"),
                      "source_reference": company_data["provenance"]["mining_directory"]})
        for commodity in mining.get("commodities") or []:
            nodes.append({"id": f"commodity-{str(commodity).lower()}", "type": "commodity", "label": commodity,
                          "source_reference": company_data["provenance"]["mining_directory"]})
    if company_data["metrics"].get("revenue") is not None:
        nodes.append({"id": "financials", "type": "financial", "label": f"Financials {company_data['metrics']['financial_year']}",
                      "detail": "Revenue / EBITDA", "source_reference": company_data["provenance"]["company_report"]})
    for peer in company_data.get("peers", [])[:4]:
        nodes.append({"id": f"peer-{peer['ticker'].lower()}", "type": "peer", "label": peer["ticker"],
                      "detail": peer["name"], "source_reference": company_data["provenance"]["company_report"]})
    edges = [{"source": ticker.lower(), "target": n["id"]} for n in nodes[1:]]
    return Envelope(data={"nodes": nodes, "edges": edges}, meta=ResponseMeta(source=source, cached=cached,
        disclosure="Graph relationships are derived from Sectors company, mining, and peer fields."))
