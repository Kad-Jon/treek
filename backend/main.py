from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from db import find_nearest, get_species

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/species")
def species():
    return get_species()


@app.get("/trees/nearest")
def nearest(
    species: str = Query(...),
    lat: float = Query(...),
    lng: float = Query(...),
):
    result = find_nearest(species, lat, lng)
    if result is None:
        raise HTTPException(status_code=404, detail="No tree found for that species")
    return result
