"""Seed mail-only recovery URLs for the existing passive baseline scan.

ZAP scan hooks: https://www.zaproxy.org/docs/docker/scan-hooks/
No real reset token, email delivery, or password mutation is required.
"""
from urllib.parse import urljoin


def zap_started(zap, target):
    for path in ("/forgot-password", "/reset-password?token=invalid-scan-token"):
        zap.core.access_url(urljoin(target, path), followredirects=False)
