"""Regression tests for the diagnostic-report redaction regex (v2.6.2).

Pre-v2.6.2 the redaction pattern matched a bare `auth` keyword. The
diagnostic generator emits lines like

    MQTT Auth:        ja

(literal "ja" or "nein" indicating whether MQTT credentials are
configured). The bare-`auth` regex matched "Auth:" with the surrounding
"key: value" pattern and rewrote the value to `[REDACTED]`, producing

    MQTT Auth:        [REDACTED]

That made bug reports from real users effectively unreadable for that
one diagnostic flag — see GitHub issue #11. The fix tightens the
keyword list to specific auth credential names: `authorization`,
`auth_key`, `auth_token`, `auth-key`, `auth-token`. Bare `auth` no
longer matches.

The replacement keywords are still aggressive enough to redact real
credentials (Authorization HTTP headers, auth_key/auth_token config
values), so this also tests the positive cases.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.redaction import sanitize_text as _sanitize_text


# ---------------------------------------------------------------------------
# Issue #11 regression: diagnostic boolean flags must NOT be redacted
# ---------------------------------------------------------------------------

def test_mqtt_auth_yes_flag_is_not_redacted():
    text = "MQTT Auth:        ja"
    assert _sanitize_text(text) == "MQTT Auth:        ja"


def test_mqtt_auth_no_flag_is_not_redacted():
    text = "MQTT Auth:        nein"
    assert _sanitize_text(text) == "MQTT Auth:        nein"


def test_full_diagnostic_block_keeps_auth_flag_visible():
    block = (
        "### Konfiguration\n"
        "MQTT aktiviert:   ja\n"
        "MQTT Host:        konfiguriert\n"
        "MQTT Auth:        ja\n"
        "HA Token:         gesetzt\n"
    )
    redacted = _sanitize_text(block)
    assert "MQTT Auth:        ja" in redacted, (
        "Diagnostic auth-flag must remain readable so users can "
        "tell us whether they configured MQTT credentials at all."
    )


# ---------------------------------------------------------------------------
# Positive cases: real credentials must still be redacted
# ---------------------------------------------------------------------------

def test_authorization_header_is_redacted():
    text = "Authorization: Bearer abc123xyz"
    redacted = _sanitize_text(text)
    # Either matched by the keyword regex or by the dedicated bearer-token
    # pattern below it. Both produce "[REDACTED]" or "Bearer [REDACTED]".
    assert "abc123xyz" not in redacted


def test_auth_token_keyword_is_redacted():
    text = 'auth_token: "my-secret-value-here"'
    redacted = _sanitize_text(text)
    assert "my-secret-value-here" not in redacted
    assert "[REDACTED]" in redacted


def test_auth_key_keyword_is_redacted():
    text = "auth_key=plaintextcredential"
    redacted = _sanitize_text(text)
    assert "plaintextcredential" not in redacted
    assert "[REDACTED]" in redacted


def test_auth_dash_token_is_redacted():
    """The regex `auth[_-]?token` covers both auth_token and auth-token."""
    text = "auth-token: hunter2"
    redacted = _sanitize_text(text)
    assert "hunter2" not in redacted


def test_password_field_is_still_redacted():
    text = "password: hunter2"
    redacted = _sanitize_text(text)
    assert "hunter2" not in redacted


def test_token_field_is_still_redacted():
    text = "token: abc123def456"
    redacted = _sanitize_text(text)
    assert "abc123def456" not in redacted


# ---------------------------------------------------------------------------
# Edge cases: words containing "auth" that aren't credential names
# ---------------------------------------------------------------------------

def test_authentication_word_alone_is_not_redacted():
    """The word 'authentication' on its own doesn't match the redaction
    keywords any more — we only want explicit credential keys to match.
    """
    text = "Authentication failed because of a network error."
    redacted = _sanitize_text(text)
    assert redacted == text


def test_unauthorized_word_alone_is_not_redacted():
    text = "Got error: unauthorized — please check token."
    redacted = _sanitize_text(text)
    # 'token' here has no key=value pattern, so survives.
    assert "unauthorized" in redacted
