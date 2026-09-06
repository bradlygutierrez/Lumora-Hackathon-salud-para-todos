from fastapi import APIRouter, File, UploadFile, status

from lumora_api.api.dependencies import CurrentUser, SessionDep
from lumora_api.core.exceptions import ValidationError
from lumora_api.schemas.account import AccountRead, AccountUpdate, ProfileImageRead
from lumora_api.services.account_service import AccountService
from lumora_api.repositories.account_repository import AccountRepository
from lumora_api.services.profile_image_storage import get_profile_image_storage


router = APIRouter(prefix="/account", tags=["Cuenta"])
MAX_IMAGE_SIZE = 5 * 1024 * 1024
IMAGE_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}


def service(session: SessionDep) -> AccountService:
    return AccountService(AccountRepository(session), get_profile_image_storage())


@router.get("/me", response_model=AccountRead)
async def get_account(current_user: CurrentUser, session: SessionDep):
    return await service(session).get(current_user.id)


@router.patch("/me", response_model=AccountRead)
async def update_account(data: AccountUpdate, current_user: CurrentUser, session: SessionDep):
    return await service(session).update(current_user.id, data)


@router.post("/me/profile-image", response_model=ProfileImageRead)
async def upload_profile_image(
    current_user: CurrentUser,
    session: SessionDep,
    file: UploadFile = File(...),
):
    extension = IMAGE_TYPES.get(file.content_type or "")
    if extension is None:
        raise ValidationError("Solo se aceptan imagenes JPEG, PNG o WebP")
    content = await file.read(MAX_IMAGE_SIZE + 1)
    if len(content) > MAX_IMAGE_SIZE:
        raise ValidationError("La imagen no puede superar 5 MB")
    signatures = {
        "jpg": content.startswith(bytes.fromhex("ffd8ff")),
        "png": content.startswith(bytes.fromhex("89504e470d0a1a0a")),
        "webp": content.startswith(b"RIFF") and content[8:12] == b"WEBP",
    }
    if not signatures[extension]:
        raise ValidationError("El contenido no coincide con el tipo de imagen")
    user = await service(session).set_image(current_user.id, content, extension)
    return ProfileImageRead(profile_image_url=user.persona.profile_image_url)


@router.delete("/me/profile-image", response_model=ProfileImageRead)
async def delete_profile_image(current_user: CurrentUser, session: SessionDep):
    user = await service(session).delete_image(current_user.id)
    return ProfileImageRead(profile_image_url=user.persona.profile_image_url)
