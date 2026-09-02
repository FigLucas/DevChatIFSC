from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, StringConstraints

Question = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)
]


class Token(BaseModel):
    access_token: str
    token_type: Literal["bearer"]
    expires_in: int


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    question: Question


class ChatResponse(BaseModel):
    answer: str
