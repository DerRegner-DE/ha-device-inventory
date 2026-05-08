"""Diagnostic-report redaction (extracted from main.py for isolated testing).

Strips secrets, emails, IPs, JWT/license tokens and bearer tokens from
arbitrary text before it leaves the backend. Used by the diagnostic
report endpoint.

Kept as a separate module so unit tests can import it without pulling
in the FastAPI app (and its full router import chain, which depends on
PDF / Excel libraries that aren't always available in CI/dev shells).
"""

from __future__ import annotations

import re

# Regex patterns to redact sensitive data from the diagnostic report.
# Applied to both config values and log lines before the report leaves the backend.
#
# Order matters: more specific patterns run first. Bearer tokens go before the
# generic "key: value" keyword pattern so that "Authorization: Bearer xyz"
# becomes "Authorization: Bearer [REDACTED]" first, instead of letting the
# keyword pass match only the literal "Bearer" and leave "xyz" exposed.
_REDACT_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    # Bearer tokens (run first so that "Authorization: Bearer xyz" gets the
    # token redacted before the keyword pattern below redacts only "Bearer").
    (re.compile(r'(?i)bearer\s+[A-Za-z0-9._\-]+'), 'Bearer [REDACTED]'),
    # Passwords / tokens / secrets in "key=value", "key: value", "key":"value" form.
    #
    # The auth-keywords are intentionally specific: `authorization`, `auth_key`,
    # `auth_token`, `auth-key`, `auth-token` — NOT a bare `auth`. Using a bare
    # `auth` matched diagnostic flags like "MQTT Auth: ja" and replaced the
    # following word ("ja"/"nein") with [REDACTED], which made bug reports
    # unreadable. Bearer tokens are caught separately above.
    (re.compile(r'(?i)(password|passwd|pwd|secret|token|api[_-]?key|authorization|auth[_-]?key|auth[_-]?token)([\'"]?\s*[:=]\s*[\'"]?)([^\s\'",}]+)'),
     r'\1\2[REDACTED]'),
    # JWT-like tokens (three base64url segments separated by dots)
    (re.compile(r'\beyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\b'), '[REDACTED_JWT]'),
    # Email addresses
    (re.compile(r'\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b'), '[REDACTED_EMAIL]'),
    # IPv4 addresses (mask last two octets)
    (re.compile(r'\b(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}\b'), r'\1.\2.***.***'),
    # License keys (payload.signature, base64url with a dot separator, >=40 chars)
    (re.compile(r'\b[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}\b'), '[REDACTED_LICENSE]'),
]


def sanitize_text(text: str) -> str:
    """Strip secrets, emails, IPs, and license keys from arbitrary text."""
    for pattern, replacement in _REDACT_PATTERNS:
        text = pattern.sub(replacement, text)
    return text
