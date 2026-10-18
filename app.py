import os
from typing import Any, Optional
from fastapi import FastAPI, File, Form, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

from core.astrology import calculate_chart, calculate_transits, calculate_transit_range
from core.geocoding import search_city
from core.palmistry import analyze_palm_image
from core.synthesis import synthesize_reading

app = FastAPI(
    title="AstroPalm Nexus",
    description="Интерактивный портал синтеза натальной карты и хиромантии",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")

os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(TEMPLATES_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
templates = Jinja2Templates(directory=TEMPLATES_DIR)


class NatalRequest(BaseModel):
    name: str = "Иван"
    year: Optional[int] = 1995
    month: Optional[int] = 8
    day: Optional[int] = 14
    hour: Optional[int] = 13
    minute: Optional[int] = 45
    birth_date: Optional[str] = None
    birth_time: Optional[str] = None
    latitude: float = 55.7558
    longitude: float = 37.6173
    timezone: str = "Europe/Moscow"
    house_system: str = "P"

    @classmethod
    def _safe_int(cls, v: Any, default: int) -> int:
        if v is None or v == "":
            return default
        try:
            val = int(v)
            return val
        except (ValueError, TypeError):
            return default

    @classmethod
    def _safe_float(cls, v: Any, default: float) -> float:
        if v is None or v == "":
            return default
        try:
            return float(v)
        except (ValueError, TypeError):
            return default


class TransitRequest(BaseModel):
    natal_chart: dict[str, Any]
    transit_date: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    timezone: str = "Europe/Moscow"
    step_hours: int = 4
    max_orb: float = 2.0


class SynthesisRequest(BaseModel):
    natal_chart: dict[str, Any]
    palm_features: dict[str, Any]
    question: Optional[str] = None


PRESET_PROFILES = [
    {
        "id": "ivan_fire",
        "name": "Иван (Огненный Лидер)",
        "birth_date": "1995-08-14",
        "birth_time": "13:45",
        "city": "Москва",
        "latitude": 55.7558,
        "longitude": 37.6173,
        "timezone": "Europe/Moscow",
        "palm_element": "fire",
        "knotty_joints": False,
        "hand_type": "right",
        "notes": "Солнце во Льве, Асцендент в Скорпионе. Рука Огня с активной линией судьбы.",
    },
    {
        "id": "mikhail_philosophic",
        "name": "Михаил (Философский Разум)",
        "birth_date": "1990-10-18",
        "birth_time": "14:30",
        "city": "Москва",
        "latitude": 55.7558,
        "longitude": 37.6173,
        "timezone": "Europe/Moscow",
        "palm_element": "philosophic",
        "knotty_joints": True,
        "hand_type": "right",
        "notes": "Квадратная ладонь, длинные пальцы, выраженные двойные узлы. Философская рука (Д'Арпентиньи).",
    },
    {
        "id": "elena_water",
        "name": "Елена (Водная Интуиция)",
        "birth_date": "1998-11-04",
        "birth_time": "08:15",
        "city": "Санкт-Петербург",
        "latitude": 59.9343,
        "longitude": 30.3351,
        "timezone": "Europe/Moscow",
        "palm_element": "water",
        "knotty_joints": False,
        "hand_type": "right",
        "notes": "Солнце в Скорпионе, Луна в Тельце. Рука Воды с глубоким холмом Луны и Венеры.",
    },
    {
        "id": "alex_air",
        "name": "Алексей (Воздушный Стратег)",
        "birth_date": "1992-05-28",
        "birth_time": "19:20",
        "city": "Казань",
        "latitude": 55.7887,
        "longitude": 49.1221,
        "timezone": "Europe/Moscow",
        "palm_element": "air",
        "knotty_joints": False,
        "hand_type": "right",
        "notes": "Солнце в Близнецах, Асцендент в Стрельце. Рука Воздуха с четкой линией Ума.",
    },
]


@app.get("/", response_class=HTMLResponse)
async def index_page(request: Request):
    return templates.TemplateResponse(request, "index.html", {})


@app.get("/api/presets")
async def get_presets():
    return {"presets": PRESET_PROFILES}


@app.get("/api/geo/search")
async def api_search_city(q: str = ""):
    results = search_city(q)
    return {"query": q, "results": results}


@app.post("/api/natal/calculate")
async def api_calculate_natal(req: NatalRequest):
    try:
        year = NatalRequest._safe_int(req.year, 1995)
        month = NatalRequest._safe_int(req.month, 8)
        day = NatalRequest._safe_int(req.day, 14)
        hour = NatalRequest._safe_int(req.hour, 13)
        minute = NatalRequest._safe_int(req.minute, 45)

        # Parse birth_date string if supplied (e.g. "20.09.1992" or "1992-09-20")
        if req.birth_date:
            raw = req.birth_date.strip()
            parts = []
            if "." in raw:
                parts = [p for p in raw.split(".") if p.strip().isdigit()]
            elif "-" in raw:
                parts = [p for p in raw.split("-") if p.strip().isdigit()]
            elif "/" in raw:
                parts = [p for p in raw.split("/") if p.strip().isdigit()]
            if len(parts) == 3:
                p_ints = [int(p) for p in parts]
                if p_ints[0] > 1000:
                    year, month, day = p_ints[0], p_ints[1], p_ints[2]
                elif p_ints[2] > 1000:
                    day, month, year = p_ints[0], p_ints[1], p_ints[2]
                else:
                    day, month, year = p_ints[0], p_ints[1], (1900 + p_ints[2] if p_ints[2] > 30 else 2000 + p_ints[2])

        if req.birth_time:
            raw_t = req.birth_time.strip().replace(".", ":").replace("-", ":")
            t_parts = [p for p in raw_t.split(":") if p.strip().isdigit()]
            if len(t_parts) >= 2:
                hour = int(t_parts[0])
                minute = int(t_parts[1])

        lat = NatalRequest._safe_float(req.latitude, 55.7558)
        lon = NatalRequest._safe_float(req.longitude, 37.6173)

        chart = calculate_chart(
            name=req.name or "Иван",
            year=year,
            month=month,
            day=day,
            hour=hour,
            minute=minute,
            latitude=lat,
            longitude=lon,
            timezone=req.timezone or "Europe/Moscow",
            house_system=req.house_system or "P",
        )
        return chart
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})


@app.post("/api/palm/analyze")
async def api_analyze_palm(
    hand_type: str = Form("right"),
    dominant: bool = Form(True),
    manual_element: Optional[str] = Form(None),
    knotty_joints: Any = Form(False),
    file: Optional[UploadFile] = File(None),
    dorsal_file: Optional[UploadFile] = File(None),
):
    try:
        image_bytes = None
        if file is not None:
            image_bytes = await file.read()

        dorsal_bytes = None
        if dorsal_file is not None:
            dorsal_bytes = await dorsal_file.read()

        is_knotty = False
        if isinstance(knotty_joints, bool):
            is_knotty = knotty_joints
        elif isinstance(knotty_joints, str):
            is_knotty = knotty_joints.strip().lower() in ["true", "1", "yes", "on"]

        palm_result = analyze_palm_image(
            image_bytes=image_bytes,
            dorsal_bytes=dorsal_bytes,
            hand_type=hand_type,
            dominant=dominant,
            manual_element=manual_element if manual_element else None,
            knotty_joints=is_knotty,
        )
        return palm_result
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})


@app.post("/api/synthesis")
async def api_synthesize(req: SynthesisRequest):
    try:
        synth = synthesize_reading(
            natal_chart=req.natal_chart,
            palm_features=req.palm_features,
            question=req.question,
        )
        return synth
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})


@app.post("/api/transits")
async def api_transits(req: TransitRequest):
    try:
        if req.start_date and req.end_date:
            res = calculate_transit_range(
                natal_chart=req.natal_chart,
                start_date_str=req.start_date,
                end_date_str=req.end_date,
                timezone=req.timezone,
                step_hours=req.step_hours,
                max_orb=req.max_orb,
            )
            return res
        elif req.transit_date:
            parts = [int(p) for p in req.transit_date.split("-")]
            res = calculate_transits(
                natal_chart=req.natal_chart,
                transit_year=parts[0],
                transit_month=parts[1],
                transit_day=parts[2],
                timezone=req.timezone,
                max_orb=req.max_orb,
            )
            return res
        else:
            return JSONResponse(status_code=400, content={"error": "Specify transit_date or start_date & end_date"})
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
