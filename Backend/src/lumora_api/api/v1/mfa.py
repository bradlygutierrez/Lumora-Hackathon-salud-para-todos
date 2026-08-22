from fastapi import APIRouter, Request, Response, status

from lumora_api.api.dependencies import CurrentUser, SessionDep
from lumora_api.repositories.mfa_repository import MfaRepository
from lumora_api.schemas import (
    TokenPair,
    MfaChallengeRequest,
    MfaChallengeResponse,
    MfaMethodRead,
    MfaRecoveryRequest,
    MfaSetupRequest,
    MfaSetupResponse,
    MfaVerifyRequest,
)
from lumora_api.services.mfa_service import MfaService

router = APIRouter(prefix="/auth/mfa", tags=["Autenticación MFA"])


@router.get("/methods", response_model=list[MfaMethodRead])
async def list_methods(current_user: CurrentUser, session: SessionDep):
    return await MfaService(MfaRepository(session)).methods(current_user.id)


@router.post("/setup", response_model=MfaSetupResponse)
async def setup(
    data: MfaSetupRequest, current_user: CurrentUser, session: SessionDep
):
    return await MfaService(MfaRepository(session)).setup(
        current_user, data.metodo_id
    )


@router.post("/challenge", response_model=MfaChallengeResponse)
async def challenge(data: MfaChallengeRequest, session: SessionDep):
    return await MfaService(MfaRepository(session)).create_challenge(
        data.username, data.password
    )


@router.post("/verify", response_model=TokenPair)
async def verify(data: MfaVerifyRequest, request: Request, session: SessionDep) -> TokenPair:
    tokens = await MfaService(MfaRepository(session)).verify(
        data.challenge_token, data.code, request.client.host if request.client else None,
        request.headers.get("user-agent"),
    )
    return TokenPair(**tokens)


@router.post("/recovery", response_model=TokenPair)
async def recovery(data: MfaRecoveryRequest, request: Request, session: SessionDep) -> TokenPair:
    tokens = await MfaService(MfaRepository(session)).recover(
        data.challenge_token, data.recovery_code, request.client.host if request.client else None,
        request.headers.get("user-agent"),
    )
    return TokenPair(**tokens)


@router.delete("/{method_id}", status_code=status.HTTP_204_NO_CONTENT)
async def disable_method(
    method_id: int, current_user: CurrentUser, session: SessionDep
) -> Response:
    await MfaService(MfaRepository(session)).disable(current_user.id, method_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
