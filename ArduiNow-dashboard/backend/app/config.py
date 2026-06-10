from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./arduinow.db"
    sensor_provider: str = "serial_arduino"
    serial_port: str = "COM7"
    serial_baudrate: int = 115200


settings = Settings()
