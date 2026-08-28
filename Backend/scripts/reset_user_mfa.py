import argparse, asyncio
from lumora_api.core.config import get_settings
from lumora_api.db.session import SessionLocal
from lumora_api.services.mfa_reset_service import reset_user_mfa
async def main(identifier: str):
    if get_settings().environment == "production": raise RuntimeError("MFA reset is development-only")
    async with SessionLocal() as session: print(f"Reset {await reset_user_mfa(session, identifier)} MFA method(s)")
if __name__ == "__main__":
    p=argparse.ArgumentParser(); g=p.add_mutually_exclusive_group(required=True); g.add_argument("--email"); g.add_argument("--username"); args=p.parse_args(); asyncio.run(main(args.email or args.username))
