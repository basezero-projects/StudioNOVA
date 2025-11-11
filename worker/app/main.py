from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import datasets, generation, jobs, training, upscale

app = FastAPI(title="StudioNOVA Worker")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root_status():
    return {"status": "StudioNOVA Worker running"}


app.include_router(training.router)
app.include_router(generation.router)
app.include_router(upscale.router)
app.include_router(jobs.router)
app.include_router(datasets.router)

