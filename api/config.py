from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mysql_host: str = "localhost"
    mysql_port: int = 3306
    mysql_user: str = "automacao"
    mysql_password: str = "rm123"
    mysql_database: str = "automacao"

    class Config:
        env_file = ".env"


settings = Settings()