"""
MCP Server for Natal Chart & Palmistry (Хиромантия и Натальная Карта)
Exposes tools for astrological calculations, palm analysis, and esoteric synthesis.
"""

import json
from typing import Any, Optional
from mcp.server.fastmcp import FastMCP

from core.astrology import calculate_chart, calculate_transits, calculate_transit_range
from core.geocoding import search_city
from core.palmistry import analyze_palm_image
from core.synthesis import synthesize_reading as core_synthesize

mcp = FastMCP(
    "natal-palmistry-hub",
    instructions=(
        "Сервер для профессионального расчета натальных карт (Swiss Ephemeris), "
        "анализа признаков ладони (хиромантия) и их глубокого эзотерического синтеза."
    ),
)


@mcp.tool()
def geocode_city(query: str, limit: int = 5) -> dict[str, Any]:
    """
    Найти координаты (широту, долготу) и часовой пояс города.
    Используется для точного ввода координат места рождения.
    """
    results = search_city(query, limit=limit)
    return {"query": query, "results": results}


@mcp.tool()
def calculate_natal_chart(
    name: str,
    year: int,
    month: int,
    day: int,
    hour: int,
    minute: int,
    latitude: float,
    longitude: float,
    timezone: str = "Europe/Moscow",
    house_system: str = "P",
) -> dict[str, Any]:
    """
    Рассчитать натальную карту по швейцарским эфемеридам (Swiss Ephemeris).
    Возвращает планеты, дома, точные аспекты, стихии, качества и углы (ASC, MC).
    """
    return calculate_chart(
        name=name,
        year=year,
        month=month,
        day=day,
        hour=hour,
        minute=minute,
        latitude=latitude,
        longitude=longitude,
        timezone=timezone,
        house_system=house_system,
    )


@mcp.tool()
def get_transits(
    natal_chart: dict[str, Any],
    transit_year: int,
    transit_month: int,
    transit_day: int,
    transit_hour: int = 12,
    timezone: str = "Europe/Moscow",
    max_orb: float = 3.0,
) -> dict[str, Any]:
    """
    Рассчитать транзитные аспекты планет на конкретную дату относительно натальной карты.
    """
    return calculate_transits(
        natal_chart=natal_chart,
        transit_year=transit_year,
        transit_month=transit_month,
        transit_day=transit_day,
        transit_hour=transit_hour,
        timezone=timezone,
        max_orb=max_orb,
    )


@mcp.tool()
def get_transits_range(
    natal_chart: dict[str, Any],
    start_date: str,
    end_date: str,
    timezone: str = "Europe/Moscow",
    step_hours: int = 4,
    max_orb: float = 2.0,
    limit: int = 50,
) -> dict[str, Any]:
    """
    Поиск пиковых транзитных аспектов за период времени (например, ближайший месяц).
    Даты в формате YYYY-MM-DD.
    """
    return calculate_transit_range(
        natal_chart=natal_chart,
        start_date_str=start_date,
        end_date_str=end_date,
        timezone=timezone,
        step_hours=step_hours,
        max_orb=max_orb,
        limit=limit,
    )


@mcp.tool()
def analyze_palm(
    image_path: Optional[str] = None,
    dorsal_image_path: Optional[str] = None,
    hand_type: str = "right",
    dominant: bool = True,
    manual_element: Optional[str] = None,
    knotty_joints: Optional[bool] = None,
) -> dict[str, Any]:
    """
    Проанализировать ладонь: форма, стихия руки, холмы планет, основные линии и лендмарки.
    Поддерживает анализ кисти снаружи (dorsal_image_path) для автоматического замера суставов пальцев.
    """
    return analyze_palm_image(
        image_path=image_path,
        dorsal_image_path=dorsal_image_path,
        hand_type=hand_type,
        dominant=dominant,
        manual_element=manual_element,
        knotty_joints=knotty_joints,
    )


@mcp.tool()
def synthesize_reading(
    natal_chart: dict[str, Any],
    palm_features: dict[str, Any],
    question: Optional[str] = None,
) -> dict[str, Any]:
    """
    Синтезировать натальную карту и хиромантию в единый архетипический отчет.
    Выявляет точки схождения, противоречия и дает практические рекомендации.
    """
    return core_synthesize(
        natal_chart=natal_chart,
        palm_features=palm_features,
        question=question,
    )


if __name__ == "__main__":
    mcp.run()
