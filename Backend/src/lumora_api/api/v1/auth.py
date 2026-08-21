from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm

from lumora_api.api.dependencies import SessionDep
from lumora_api.repositories.auth_repository import AuthRepository
from lumora_api.schemas import (
    AccessToken,
    ForgotPasswordRequest,
    MessageResponse,
    ResetPasswordRequest,
    VerifyEmailRequest,
)
from lumora_api.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/token", response_model=AccessToken, summary="Obtener token OAuth2")
async def login(
    form: Annotated[OAuth2PasswordRequestForm, Depends()], session: SessionDep
) -> AccessToken:
    token = await AuthService(AuthRepository(session)).authenticate(
        form.username, form.password
    )
    return AccessToken(access_token=token)


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    data: ForgotPasswordRequest, session: SessionDep
) -> MessageResponse:
    await AuthService(AuthRepository(session)).create_recovery(str(data.email))
    return MessageResponse(
        message="Si el correo existe, se enviaron instrucciones de recuperación"
    )


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    data: ResetPasswordRequest, session: SessionDep
) -> MessageResponse:
    await AuthService(AuthRepository(session)).reset_password(
        data.token, data.new_password
    )
    return MessageResponse(message="Contraseña actualizada")


@router.post("/verify-email", response_model=MessageResponse)
async def verify_email(
    data: VerifyEmailRequest, session: SessionDep
) -> MessageResponse:
    await AuthService(AuthRepository(session)).verify_email(data.token)
    return MessageResponse(message="Correo verificado")
