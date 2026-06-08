from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./arduinow.db"
    sensor_provider: str = "dummy"


settings = Settings()
