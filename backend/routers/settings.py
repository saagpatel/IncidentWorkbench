"""Settings and connection testing router."""

from typing import Annotated

from fastapi import APIRouter, Depends

from exceptions import JiraConnectionError, SlackAPIError, StatuspageAPIError, ZendeskAPIError
from models.api import (
    JiraConnectionTestRequest,
    SlackConnectionTestRequest,
    StatuspageConnectionTestRequest,
    TestConnectionResponse,
    ZendeskConnectionTestRequest,
)
from security.auth import AuthUser, require_roles_dependency
from services.jira_client import JiraClient
from services.slack_client import SlackClient
from services.statuspage_client import StatuspageClient
from services.zendesk_client import ZendeskClient

router = APIRouter(prefix="/settings", tags=["settings"])
AdminUser = Annotated[AuthUser, Depends(require_roles_dependency({"admin"}))]


@router.post("/test-jira")
async def test_jira_connection(
    request: JiraConnectionTestRequest,
    current_user: AdminUser,
) -> TestConnectionResponse:
    """Test Jira connection with provided credentials."""
    del current_user
    client = JiraClient(
        url=request.url,
        email=request.email,
        api_token=request.api_token,
    )

    try:
        server_info = await client.test_connection()
        return TestConnectionResponse(
            success=True,
            message="Successfully connected to Jira",
            details={
                "url": request.url,
                "email": request.email,
                "server_title": server_info.get("title", "Unknown"),
                "server_version": server_info.get("version", "Unknown"),
            },
        )
    except JiraConnectionError as e:
        return TestConnectionResponse(
            success=False,
            message=e.message,
            details=e.details,
        )
    except Exception as e:
        return TestConnectionResponse(
            success=False,
            message=f"Unexpected error: {str(e)}",
            details={},
        )


@router.post("/test-slack")
async def test_slack_connection(
    request: SlackConnectionTestRequest,
    current_user: AdminUser,
) -> TestConnectionResponse:
    """Test Slack connection with provided bot token."""
    del current_user
    client = SlackClient(bot_token=request.bot_token)

    try:
        auth_info = await client.test_connection()
        return TestConnectionResponse(
            success=True,
            message="Successfully connected to Slack",
            details={
                "team": auth_info.get("team", "Unknown"),
                "user": auth_info.get("user", "Unknown"),
            },
        )
    except SlackAPIError as e:
        return TestConnectionResponse(
            success=False,
            message=e.message,
            details=e.details,
        )
    except Exception as e:
        return TestConnectionResponse(
            success=False,
            message=f"Unexpected error: {str(e)}",
            details={},
        )


@router.post("/test-statuspage")
async def test_statuspage_connection(
    request: StatuspageConnectionTestRequest,
    current_user: AdminUser,
) -> TestConnectionResponse:
    """Test Statuspage connection with provided credentials."""
    del current_user
    client = StatuspageClient(page_id=request.page_id, api_key=request.api_key)

    try:
        statuspage_info = await client.test_connection()
        return TestConnectionResponse(
            success=True,
            message="Successfully connected to Statuspage",
            details=statuspage_info,
        )
    except StatuspageAPIError as e:
        return TestConnectionResponse(
            success=False,
            message=e.message,
            details=e.details,
        )
    except Exception as e:
        return TestConnectionResponse(
            success=False,
            message=f"Unexpected error: {str(e)}",
            details={},
        )


@router.post("/test-zendesk")
async def test_zendesk_connection(
    request: ZendeskConnectionTestRequest,
    current_user: AdminUser,
) -> TestConnectionResponse:
    """Test Zendesk connection with provided credentials."""
    del current_user
    client = ZendeskClient(
        url=request.url,
        email=request.email,
        api_token=request.api_token,
    )

    try:
        zendesk_info = await client.test_connection()
        return TestConnectionResponse(
            success=True,
            message="Successfully connected to Zendesk",
            details=zendesk_info,
        )
    except ZendeskAPIError as e:
        return TestConnectionResponse(
            success=False,
            message=e.message,
            details=e.details,
        )
    except Exception as e:
        return TestConnectionResponse(
            success=False,
            message=f"Unexpected error: {str(e)}",
            details={},
        )
