from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from fastapi.security import OAuth2PasswordRequestForm

from lumora_api.api.dependencies import CurrentSessionId, CurrentUser, SessionDep
from lumora_api.repositories.auth_repository import AuthRepository
from lumora_api.schemas import (
    AccessToken,
    ForgotPasswordRequest,
    MessageResponse,
    ResetPasswordRequest,
    VerifyEmailRequest,
    LoginRequest,
    PatientRegistrationRequest,
    RegistrationResponse,
    RefreshRequest,
    SessionRead,
    TokenPair,
)
from lumora_api.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Autenticación"])


def client_data(request: Request) -> tuple[str | None, str | None]:
    return (request.client.host if request.client else None, request.headers.get("user-agent"))


@router.post("/register", response_model=RegistrationResponse, status_code=status.HTTP_201_CREATED)
async def register(data: PatientRegistrationRequest, session: SessionDep):
    return await AuthService(AuthRepository(session)).register_patient(data)


@router.post("/login", response_model=TokenPair)
async def session_login(data: LoginRequest, request: Request, session: SessionDep):
    return await AuthService(AuthRepository(session)).login(data.login, data.password, *client_data(request))


@router.post("/refresh", response_model=TokenPair)
async def refresh(data: RefreshRequest, request: Request, session: SessionDep):
    return await AuthService(AuthRepository(session)).refresh(data.refresh_token, *client_data(request))


@router.post("/logout", response_model=MessageResponse)
async def logout(current_user: CurrentUser, current_session_id: CurrentSessionId, session: SessionDep):
    await AuthService(AuthRepository(session)).logout(current_user.id, current_session_id)
    return MessageResponse(message="Sesión cerrada")


@router.post("/logout-all", response_model=MessageResponse)
async def logout_all(current_user: CurrentUser, session: SessionDep):
    await AuthService(AuthRepository(session)).logout_all(current_user.id)
    return MessageResponse(message="Todas las sesiones fueron cerradas")


@router.get("/sessions", response_model=list[SessionRead])
async def sessions(current_user: CurrentUser, session: SessionDep):
    return await AuthService(AuthRepository(session)).sessions(current_user.id)


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
