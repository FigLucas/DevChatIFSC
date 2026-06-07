from pydantic import BaseModel

class Token(BaseModel):
    access_token: str
    token_type: str

class ChatRequest(BaseModel):
    question: str

class ChatResponse(BaseModel):
    answer: str