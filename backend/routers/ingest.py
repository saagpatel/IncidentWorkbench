"""Incident ingestion router."""

import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, Depends

from config import settings
from database import db
from exceptions import JiraConnectionError, JiraQueryError, SlackAPIError
from models.api import (
    IngestResponse,
    JiraIngestRequest,
    SlackExportIngestRequest,
    SlackIngestRequest,
)
from models.incident import IncidentSource
from security.auth import AuthUser, require_roles_dependency
from services.jira_client import JiraClient
from services.normalizer import IncidentNormalizer
from services.slack_client import SlackClient

router = APIRouter(prefix="/ingest", tags=["ingest"])
AdminUser = Annotated[AuthUser, Depends(require_roles_dependency({"admin"}))]


def _resolve_safe_export_path(raw_path: str) -> Path:
    """Restrict json_path ingestion to a configured safe directory."""
    if "\x00" in raw_path:
        raise ValueError("json_path must be a valid relative .json file path")

    requested_path = Path(raw_path)
    if requested_path.is_absolute() or ".." in requested_path.parts:
        raise ValueError("json_path must be a relative path under the import directory")

    if requested_path.suffix.lower() != ".json":
        raise ValueError("json_path must reference a .json file")

    allowed_root = settings.slack_export_dir.expanduser().resolve()
    json_file = (allowed_root / requested_path).resolve()
    try:
        json_file.relative_to(allowed_root)
    except ValueError as exc:
        raise ValueError("json_path must stay under the configured import directory") from exc

    if not json_file.is_file():
        raise ValueError("json_path does not exist")

    return json_file


@router.post("/jira")
async def ingest_from_jira(request: JiraIngestRequest, current_user: AdminUser) -> IngestResponse:
    """Ingest incidents from Jira using JQL query."""
    del current_user
    errors = []
    ingested = 0
    updated = 0

    try:
        # Initialize Jira client
        client = JiraClient(
            url=request.url,
            email=request.email,
            api_token=request.api_token,
        )

        # Fetch issues
        issues = await client.search_issues(jql=request.jql)

        # Normalize and insert each issue
        conn = db.get_connection()
        try:
            for issue in issues:
                try:
                    incident = IncidentNormalizer.normalize_jira_issue(issue)

                    # Check if row exists before upsert to track inserts vs updates
                    check = conn.execute(
                        "SELECT id FROM incidents WHERE external_id = ? AND source = ?",
                        (incident.external_id, incident.source.value),
                    ).fetchone()
                    existed_before = check is not None

                    # Prepare insert query
                    cursor = conn.execute(
                        """
                        INSERT INTO incidents (
                            external_id, source, severity, title, description,
                            occurred_at, resolved_at, raw_data
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(external_id, source) DO UPDATE SET
                            severity = excluded.severity,
                            title = excluded.title,
                            description = excluded.description,
                            resolved_at = excluded.resolved_at,
                            raw_data = excluded.raw_data
                        """,
                        (
                            incident.external_id,
                            incident.source.value,
                            incident.severity.value,
                            incident.title,
                            incident.description,
                            incident.occurred_at.isoformat(),
                            incident.resolved_at.isoformat() if incident.resolved_at else None,
                            json.dumps(incident.raw_data),
                        ),
                    )

                    # Track whether this was an insert or update
                    if cursor.rowcount > 0:
                        if existed_before:
                            updated += 1
                        else:
                            ingested += 1

                except Exception as e:
                    errors.append(
                        f"Failed to normalize issue {issue.get('key', 'unknown')}: {str(e)}"
                    )

            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    except JiraConnectionError as e:
        errors.append(f"Connection error: {e.message}")
    except JiraQueryError as e:
        errors.append(f"Query error: {e.message}")
    except Exception as e:
        errors.append(f"Unexpected error: {str(e)}")

    return IngestResponse(
        incidents_ingested=ingested,
        incidents_updated=updated,
        errors=errors,
    )


@router.post("/slack")
async def ingest_from_slack(request: SlackIngestRequest, current_user: AdminUser) -> IngestResponse:
    """Ingest incidents from Slack channel history."""
    del current_user
    errors = []
    ingested = 0
    updated = 0

    try:
        # Initialize Slack client
        client = SlackClient(bot_token=request.bot_token)

        # Calculate time range
        now = datetime.utcnow()
        oldest = (now - timedelta(days=request.days_back)).timestamp()
        latest = now.timestamp()

        # Fetch messages
        messages = await client.fetch_channel_messages(
            channel_id=request.channel_id,
            oldest=oldest,
            latest=latest,
        )

        # Group messages by thread
        threads: dict[str, list[dict[str, Any]]] = {}
        for msg in messages:
            raw_thread_ts = msg.get("thread_ts", msg.get("ts"))
            if raw_thread_ts is None:
                continue
            thread_ts = str(raw_thread_ts)
            if thread_ts not in threads:
                threads[thread_ts] = []
            threads[thread_ts].append(msg)

        # Normalize and insert each thread
        conn = db.get_connection()
        try:
            for thread_ts, thread_msgs in threads.items():
                try:
                    # Sort messages by timestamp
                    thread_msgs.sort(key=lambda m: float(m.get("ts", "0")))

                    incident = IncidentNormalizer.normalize_slack_thread(
                        messages=thread_msgs,
                        channel=request.channel_id,
                        source=IncidentSource.SLACK,
                    )

                    # Check if row exists before upsert to track inserts vs updates
                    check = conn.execute(
                        "SELECT id FROM incidents WHERE external_id = ? AND source = ?",
                        (incident.external_id, incident.source.value),
                    ).fetchone()
                    existed_before = check is not None

                    # Insert or update
                    cursor = conn.execute(
                        """
                        INSERT INTO incidents (
                            external_id, source, severity, title, description,
                            occurred_at, resolved_at, raw_data
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(external_id, source) DO UPDATE SET
                            severity = excluded.severity,
                            title = excluded.title,
                            description = excluded.description,
                            resolved_at = excluded.resolved_at,
                            raw_data = excluded.raw_data
                        """,
                        (
                            incident.external_id,
                            incident.source.value,
                            incident.severity.value,
                            incident.title,
                            incident.description,
                            incident.occurred_at.isoformat(),
                            incident.resolved_at.isoformat() if incident.resolved_at else None,
                            json.dumps(incident.raw_data),
                        ),
                    )

                    if cursor.rowcount > 0:
                        if existed_before:
                            updated += 1
                        else:
                            ingested += 1

                except Exception as e:
                    errors.append(f"Failed to normalize thread {thread_ts}: {str(e)}")

            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    except SlackAPIError as e:
        errors.append(f"Slack API error: {e.message}")
    except Exception as e:
        errors.append(f"Unexpected error: {str(e)}")

    return IngestResponse(
        incidents_ingested=ingested,
        incidents_updated=updated,
        errors=errors,
    )


@router.post("/slack-export")
async def ingest_from_slack_export(
    request: SlackExportIngestRequest, current_user: AdminUser
) -> IngestResponse:
    """Ingest incidents from exported Slack JSON."""
    del current_user
    errors = []
    ingested = 0
    updated = 0

    try:
        # Load export data from either inline JSON or file path.
        if request.json_content is not None:
            export_data = request.json_content
        elif request.json_path is not None:
            json_file = _resolve_safe_export_path(request.json_path)
            export_data = json_file.read_text(encoding="utf-8")
        else:
            # Should be unreachable due request model validation.
            raise ValueError("Either json_content or json_path must be provided")

        # Parse export
        messages = SlackClient.parse_export(export_data)

        # Group by thread
        threads: dict[str, list[dict[str, Any]]] = {}
        for msg in messages:
            raw_thread_ts = msg.get("thread_ts", msg.get("ts"))
            if raw_thread_ts is None:
                continue
            thread_ts = str(raw_thread_ts)
            if thread_ts not in threads:
                threads[thread_ts] = []
            threads[thread_ts].append(msg)

        # Normalize and insert
        conn = db.get_connection()
        try:
            for thread_ts, thread_msgs in threads.items():
                try:
                    thread_msgs.sort(key=lambda m: float(m.get("ts", "0")))

                    incident = IncidentNormalizer.normalize_slack_thread(
                        messages=thread_msgs,
                        channel=request.channel_name,
                        source=IncidentSource.SLACK_EXPORT,
                    )

                    # Check if row exists before upsert to track inserts vs updates
                    check = conn.execute(
                        "SELECT id FROM incidents WHERE external_id = ? AND source = ?",
                        (incident.external_id, incident.source.value),
                    ).fetchone()
                    existed_before = check is not None

                    cursor = conn.execute(
                        """
                        INSERT INTO incidents (
                            external_id, source, severity, title, description,
                            occurred_at, resolved_at, raw_data
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(external_id, source) DO UPDATE SET
                            severity = excluded.severity,
                            title = excluded.title,
                            description = excluded.description,
                            resolved_at = excluded.resolved_at,
                            raw_data = excluded.raw_data
                        """,
                        (
                            incident.external_id,
                            incident.source.value,
                            incident.severity.value,
                            incident.title,
                            incident.description,
                            incident.occurred_at.isoformat(),
                            incident.resolved_at.isoformat() if incident.resolved_at else None,
                            json.dumps(incident.raw_data),
                        ),
                    )

                    if cursor.rowcount > 0:
                        if existed_before:
                            updated += 1
                        else:
                            ingested += 1

                except Exception as e:
                    errors.append(f"Failed to normalize thread {thread_ts}: {str(e)}")

            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    except FileNotFoundError:
        errors.append(f"File not found: {request.json_path}")
    except json.JSONDecodeError as e:
        errors.append(f"Invalid JSON: {str(e)}")
    except SlackAPIError as e:
        errors.append(f"Parse error: {e.message}")
    except Exception as e:
        errors.append(f"Unexpected error: {str(e)}")

    return IngestResponse(
        incidents_ingested=ingested,
        incidents_updated=updated,
        errors=errors,
    )
