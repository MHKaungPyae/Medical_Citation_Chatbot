"""Supabase client singleton.

Uses the service_role key for backend operations (bypasses RLS).
The anon key is only used for frontend auth — the backend needs
full access to read/write messages without user context.
"""

import logging
import os
from supabase import create_client, Client

logger = logging.getLogger(__name__)

_supabase: Client | None = None


def get_supabase() -> Client:
    """Return the shared Supabase client (service_role key)."""
    global _supabase
    if _supabase is None:
        url = os.environ.get("SUPABASE_URL", "")
        # Prefer service_role key (bypasses RLS), fall back to anon key
        service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        anon_key = os.environ.get("SUPABASE_KEY", "")
        key = service_key or anon_key

        if not url or not key:
            raise RuntimeError(
                "Missing SUPABASE_URL or SUPABASE_KEY environment variables."
            )

        key_type = "service_role" if service_key else "anon"
        logger.info("Supabase client: using %s key", key_type)
        _supabase = create_client(url, key)
    return _supabase
