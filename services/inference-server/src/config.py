from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_weights_path: str = "/models/wilddet3d/weights.pth"
    device: str = "cuda:0"
    fp16: bool = True
    max_image_size: int = 1920
    score_threshold_default: float = 0.3
    port: int = 8000

    model_config = {"env_prefix": ""}


settings = Settings()
