class DomainError(Exception):
    status_code = 400
    code = "domain_error"

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class ResourceNotFoundError(DomainError):
    status_code = 404
    code = "not_found"


class ResourceConflictError(DomainError):
    status_code = 409
    code = "conflict"


class AuthenticationError(DomainError):
    status_code = 401
    code = "unauthorized"


class PermissionDeniedError(DomainError):
    status_code = 403
    code = "forbidden"


class InvalidTokenError(DomainError):
    status_code = 400
    code = "invalid_token"


class MfaRequiredError(DomainError):
    status_code = 403
    code = "mfa_required"


class InvalidMfaCodeError(DomainError):
    status_code = 400
    code = "invalid_mfa_code"
