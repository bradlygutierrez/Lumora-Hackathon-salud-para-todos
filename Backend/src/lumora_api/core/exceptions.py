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
