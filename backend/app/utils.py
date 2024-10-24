import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import emails  # type: ignore
import jwt
from jinja2 import Template
from jwt.exceptions import InvalidTokenError

import requests
from bs4 import BeautifulSoup
import urllib.parse

from app.core import security
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class EmailData:
    html_content: str
    subject: str


def render_email_template(*, template_name: str, context: dict[str, Any]) -> str:
    template_str = (
        Path(__file__).parent / "email-templates" / "build" / template_name
    ).read_text()
    html_content = Template(template_str).render(context)
    return html_content


def send_email(
    *,
    email_to: str,
    subject: str = "",
    html_content: str = "",
) -> None:
    assert settings.emails_enabled, "no provided configuration for email variables"
    message = emails.Message(
        subject=subject,
        html=html_content,
        mail_from=(settings.EMAILS_FROM_NAME, settings.EMAILS_FROM_EMAIL),
    )
    smtp_options = {"host": settings.SMTP_HOST, "port": settings.SMTP_PORT}
    if settings.SMTP_TLS:
        smtp_options["tls"] = True
    elif settings.SMTP_SSL:
        smtp_options["ssl"] = True
    if settings.SMTP_USER:
        smtp_options["user"] = settings.SMTP_USER
    if settings.SMTP_PASSWORD:
        smtp_options["password"] = settings.SMTP_PASSWORD
    response = message.send(to=email_to, smtp=smtp_options)
    logger.info(f"send email result: {response}")


def generate_test_email(email_to: str) -> EmailData:
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} - Test email"
    html_content = render_email_template(
        template_name="test_email.html",
        context={"project_name": settings.PROJECT_NAME, "email": email_to},
    )
    return EmailData(html_content=html_content, subject=subject)


def generate_reset_password_email(email_to: str, email: str, token: str) -> EmailData:
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} - Password recovery for user {email}"
    link = f"{settings.FRONTEND_HOST}/reset-password?token={token}"
    html_content = render_email_template(
        template_name="reset_password.html",
        context={
            "project_name": settings.PROJECT_NAME,
            "username": email,
            "email": email_to,
            "valid_hours": settings.EMAIL_RESET_TOKEN_EXPIRE_HOURS,
            "link": link,
        },
    )
    return EmailData(html_content=html_content, subject=subject)


def generate_new_account_email(
    email_to: str, username: str, password: str
) -> EmailData:
    project_name = settings.PROJECT_NAME
    subject = f"{project_name} - New account for user {username}"
    html_content = render_email_template(
        template_name="new_account.html",
        context={
            "project_name": settings.PROJECT_NAME,
            "username": username,
            "password": password,
            "email": email_to,
            "link": settings.FRONTEND_HOST,
        },
    )
    return EmailData(html_content=html_content, subject=subject)


def generate_password_reset_token(email: str) -> str:
    delta = timedelta(hours=settings.EMAIL_RESET_TOKEN_EXPIRE_HOURS)
    now = datetime.now(timezone.utc)
    expires = now + delta
    exp = expires.timestamp()
    encoded_jwt = jwt.encode(
        {"exp": exp, "nbf": now, "sub": email},
        settings.SECRET_KEY,
        algorithm=security.ALGORITHM,
    )
    return encoded_jwt


def verify_password_reset_token(token: str) -> str | None:
    try:
        decoded_token = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        return str(decoded_token["sub"])
    except InvalidTokenError:
        return None


def get_site_content(url: str) -> str | None:
    try:
        content = requests.get(url).text
        pretty_content = BeautifulSoup(content, "html.parser").text
        return pretty_content
    except:
        return None


def get_time() -> str:
    return datetime.now(timezone.utc).isoformat()


def ensure_https(url):
    """
    Ensure the given URL starts with 'https://'.

    Args:
        url (str): The input URL string.

    Returns:
        str: The URL with 'https://' prepended if it doesn't already start with 'http://' or 'https://'.
    """
    # Parse the URL to check its scheme
    parsed_url = urllib.parse.urlparse(url)

    # Check if the URL already starts with 'https://'
    if not (parsed_url.scheme == "https"):
        # Reconstruct the URL with 'https://' scheme
        netloc = parsed_url.netloc or ""
        path = parsed_url.path or "/"
        query = parsed_url.query or ""
        fragment = parsed_url.fragment or ""

        url = (
            "https://"
            + netloc
            + path
            + ("?" if query else "")
            + query
            + ("#" if fragment else "")
            + fragment
        )

    return url


def is_older_than_one_day(iso_date_string):

    if iso_date_string == None or iso_date_string.strip() == "":
        return True

    # Parse the ISO-formatted date string into a datetime object
    iso_date = datetime.fromisoformat(iso_date_string)

    # Get the current time as a datetime object
    now = datetime.now(timezone.utc)

    # Calculate the difference between the current time and the parsed datetime
    delta = now - iso_date

    # Check if this difference is more than one day (24 hours)
    return delta > timedelta(days=1)
