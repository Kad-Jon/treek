from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from db import find_nearest, get_species
from route import shortest_loop

# Google Maps direction URLs accept at most 9 waypoints.
MAX_WALK_STOPS = 9

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


@app.get("/walk")
def walk(
    species: list[str] = Query(...),
    lat: float = Query(...),
    lng: float = Query(...),
):
    unique = list(dict.fromkeys(s.strip() for s in species if s.strip()))
    if not unique:
        raise HTTPException(status_code=422, detail="Pick at least one species")
    if len(unique) > MAX_WALK_STOPS:
        raise HTTPException(
            status_code=422,
            detail=f"A walk can include at most {MAX_WALK_STOPS} species",
        )

    stops = []
    for name in unique:
        tree = find_nearest(name, lat, lng)
        if tree is None:
            raise HTTPException(status_code=404, detail=f"No tree found for {name}")
        stops.append(tree)

    order, distance_m = shortest_loop(
        (lat, lng), [(s["lat"], s["lon"]) for s in stops]
    )
    return {
        "stops": [stops[i] for i in order],
        "distance_m": round(distance_m),
    }
