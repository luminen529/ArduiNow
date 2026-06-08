from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./arduinow.db"
    sensor_provider: str = "dummy"
    serial_port: str = "COM3"
    serial_baudrate: int = 115200


settings = Settings()
