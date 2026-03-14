"""FastAPI application entry point."""

from __future__ import annotations

import logging
import os
from collections import deque
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from api.problem import problem_response
from config import settings as app_settings
from database import db
from exceptions import WorkbenchError
from observability.bootstrap import setup_observability
from observability.logging import configure_structured_logging
from observability.middleware import RequestContextMiddleware
from routers import auth, clusters, health, incidents, ingest, reports, webhooks
from routers import settings as settings_router
from security.auth import ensure_bootstrap_admin
from security.csrf import CSRFMiddleware
from security.idempotency import IdempotencyMiddleware
from security.settings import trusted_origins

logger = logging.getLogger(__name__)
backend_port = int(os.getenv("WORKBENCH_BACKEND_PORT", "8765"))

API_TAGS = [
    {"name": "auth", "description": "Session authentication and user context."},
    {"name": "health", "description": "Liveness and readiness endpoints."},
    {"name": "settings", "description": "External service connectivity checks."},
    {"name": "ingest", "description": "Incident ingestion from Jira and Slack."},
    {"name": "incidents", "description": "Incident retrieval and maintenance."},
    {"name": "clusters", "description": "Embedding and clustering operations."},
    {"name": "reports", "description": "Report generation and downloads."},
    {"name": "webhooks", "description": "Webhook ingestion with replay protection."},
]

PROBLEM_DETAILS_SCHEMA = {
    "type": "object",
    "required": ["type", "title", "status"],
    "properties": {
        "type": {"type": "string"},
        "title": {"type": "string"},
        "status": {"type": "integer"},
        "detail": {"type": "string"},
        "instance": {"type": "string"},
        "request_id": {"type": "string"},
        "trace_id": {"type": "string"},
    },
}


SCHEMA_REF_PREFIX = "#/components/schemas/"


def _is_null_type_schema(candidate: object) -> bool:
    return isinstance(candidate, dict) and candidate.get("type") == "null"


def _normalize_nullable_for_oas30(node: object) -> None:
    """Convert JSON Schema null unions into OAS3 nullable form."""
    if isinstance(node, dict):
        any_of = node.get("anyOf")
        if isinstance(any_of, list):
            non_null = [item for item in any_of if not _is_null_type_schema(item)]
            null_entries = [item for item in any_of if _is_null_type_schema(item)]
            if len(non_null) == 1 and len(null_entries) == 1 and isinstance(non_null[0], dict):
                preserved = {k: v for k, v in node.items() if k != "anyOf"}
                selected = dict(non_null[0])

                node.clear()
                if "$ref" in selected and len(selected) == 1:
                    node["allOf"] = [{"$ref": selected["$ref"]}]
                else:
                    node.update(selected)
                node.update(preserved)
                node["nullable"] = True

        for value in list(node.values()):
            _normalize_nullable_for_oas30(value)
    elif isinstance(node, list):
        for item in node:
            _normalize_nullable_for_oas30(item)


def _iter_schema_refs(node: object) -> set[str]:
    refs: set[str] = set()
    if isinstance(node, dict):
        for key, value in node.items():
            if key == "$ref" and isinstance(value, str) and value.startswith(SCHEMA_REF_PREFIX):
                refs.add(value.removeprefix(SCHEMA_REF_PREFIX))
            else:
                refs.update(_iter_schema_refs(value))
    elif isinstance(node, list):
        for item in node:
            refs.update(_iter_schema_refs(item))
    return refs


def _prune_unused_component_schemas(schema: dict) -> None:
    """Drop unreachable component schemas so contract/lint output stays clean."""
    components = schema.get("components")
    if not isinstance(components, dict):
        return
    schemas = components.get("schemas")
    if not isinstance(schemas, dict):
        return

    root_refs: set[str] = set()
    for key, value in schema.items():
        if key != "components":
            root_refs.update(_iter_schema_refs(value))
            continue

        if not isinstance(value, dict):
            continue
        for component_name, component_value in value.items():
            if component_name == "schemas":
                continue
            root_refs.update(_iter_schema_refs(component_value))

    reachable: set[str] = set()
    queue: deque[str] = deque(root_refs)

    while queue:
        schema_name = queue.popleft()
        if schema_name in reachable:
            continue
        definition = schemas.get(schema_name)
        if not isinstance(definition, dict):
            continue
        reachable.add(schema_name)
        for nested_ref in _iter_schema_refs(definition):
            if nested_ref not in reachable:
                queue.append(nested_ref)

    for schema_name in list(schemas.keys()):
        if schema_name not in reachable:
            schemas.pop(schema_name, None)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    configure_structured_logging()
    app_settings.validate_security()
    logger.info("running database migrations")
    db.run_migrations()
    ensure_bootstrap_admin()
    logger.info("database migrations complete")

    setup_observability(app)

    yield

    logger.info("backend shutdown complete")


app = FastAPI(
    title="Incident Workbench API",
    description="Backend API for incident analysis and clustering",
    version="0.1.0",
    contact={
        "name": "Incident Workbench Backend",
        "email": "backend@incident-workbench.local",
    },
    servers=[
        {
            "url": f"http://127.0.0.1:{backend_port}",
            "description": "Local development runtime",
        }
    ],
    openapi_tags=API_TAGS,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(trusted_origins()),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(CSRFMiddleware)
app.add_middleware(IdempotencyMiddleware)
app.add_middleware(RequestContextMiddleware)


def custom_openapi() -> dict:
    """Normalize OpenAPI output for linting + contract tooling compatibility."""
    if app.openapi_schema:
        return app.openapi_schema

    schema = get_openapi(
        openapi_version="3.0.3",
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    _normalize_nullable_for_oas30(schema)
    schema["openapi"] = "3.0.3"
    schema.pop("jsonSchemaDialect", None)

    schema.setdefault("servers", app.servers)
    if app.openapi_tags:
        schema.setdefault("tags", app.openapi_tags)

    info = schema.setdefault("info", {})
    if isinstance(info, dict) and app.contact:
        info.setdefault("contact", app.contact)

    components = schema.setdefault("components", {})
    if isinstance(components, dict):
        schemas = components.setdefault("schemas", {})
        if isinstance(schemas, dict):
            schemas.setdefault("ProblemDetails", PROBLEM_DETAILS_SCHEMA)

    http_methods = {"get", "put", "post", "delete", "patch", "options", "head", "trace"}

    paths = schema.get("paths", {})
    if isinstance(paths, dict):
        for path_item in paths.values():
            if not isinstance(path_item, dict):
                continue

            for method, operation in path_item.items():
                if method.lower() not in http_methods or not isinstance(operation, dict):
                    continue

                responses = operation.get("responses", {})
                if not isinstance(responses, dict):
                    continue

                for status_code, response in responses.items():
                    if not str(status_code).startswith(("4", "5")):
                        continue
                    if not isinstance(response, dict):
                        continue

                    # Runtime emits RFC 9457 responses for all 4xx/5xx outcomes.
                    # Normalize docs to a single error media type to keep contract
                    # validation deterministic.
                    response["content"] = {
                        "application/problem+json": {
                            "schema": {"$ref": "#/components/schemas/ProblemDetails"}
                        }
                    }

    _prune_unused_component_schemas(schema)

    app.openapi_schema = schema
    return schema


app.openapi = custom_openapi  # type: ignore[method-assign]


def _status_for_workbench_error(exc: WorkbenchError) -> int:
    from exceptions import (
        InsufficientDataError,
        JiraConnectionError,
        JiraQueryError,
        OllamaModelNotFoundError,
        OllamaUnavailableError,
        ReportGenerationError,
        SlackAPIError,
    )

    if isinstance(exc, (OllamaUnavailableError, OllamaModelNotFoundError)):
        return 503
    if isinstance(exc, (JiraConnectionError, SlackAPIError)):
        return 502
    if isinstance(exc, JiraQueryError):
        return 422
    if isinstance(exc, InsufficientDataError):
        return 422
    if isinstance(exc, ReportGenerationError):
        return 500
    return 500


def _problem(
    request: Request,
    *,
    status: int,
    title: str,
    detail: str | None,
    type_: str,
    extras: dict | None = None,
):
    return problem_response(
        status=status,
        title=title,
        detail=detail,
        type_=type_,
        instance=str(request.url.path),
        request_id=getattr(request.state, "request_id", None),
        trace_id=getattr(request.state, "trace_id", None),
        extras=extras,
    )


@app.exception_handler(WorkbenchError)
async def workbench_exception_handler(request: Request, exc: WorkbenchError):
    """Return RFC 9457 Problem Details for domain-specific errors."""
    status_code = _status_for_workbench_error(exc)
    return _problem(
        request,
        status=status_code,
        title="Workbench Error",
        detail=exc.message,
        type_="https://incident-workbench.dev/problems/workbench-error",
        extras={"error_type": exc.__class__.__name__},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    detail = exc.detail if isinstance(exc.detail, str) else "Request failed"

    return _problem(
        request,
        status=exc.status_code,
        title="Request Error",
        detail=detail,
        type_="about:blank",
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    del exc
    return _problem(
        request,
        status=422,
        title="Validation Error",
        detail="Request validation failed.",
        type_="https://incident-workbench.dev/problems/validation",
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("unhandled exception", exc_info=exc)
    return _problem(
        request,
        status=500,
        title="Internal Server Error",
        detail="Unexpected backend error.",
        type_="https://incident-workbench.dev/problems/internal",
    )


def _mount_api_router(router) -> None:
    """Mount versioned routes while preserving legacy unversioned compatibility."""
    app.include_router(router, prefix="/v1")
    app.include_router(router, include_in_schema=False)


for api_router in (
    auth.router,
    health.router,
    settings_router.router,
    ingest.router,
    incidents.router,
    clusters.router,
    reports.router,
    webhooks.router,
):
    _mount_api_router(api_router)


if __name__ == "__main__":
    import sys

    import uvicorn

    if len(sys.argv) > 1 and sys.argv[1] == "--port":
        port = int(sys.argv[2])
        print(port)
        uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
    else:
        port = 8765
        print(port)
        uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
