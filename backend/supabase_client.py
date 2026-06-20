"""Supabase client singleton."""

import os
from supabase import create_client, Client

_supabase: Client | None = None


def get_supabase() -> Client:
    """Return the shared Supabase client."""
    global _supabase
    if _supabase is None:
        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_KEY", "")
        if not url or not key:
            raise RuntimeError(
                "Missing SUPABASE_URL or SUPABASE_KEY environment variables."
            )
        _supabase = create_client(url, key)
    return _supabase
