import requests
from typing import Any

POPULAR_CITIES = [
    {"name": "Москва", "country": "Россия", "latitude": 55.7558, "longitude": 37.6173, "timezone": "Europe/Moscow"},
    {"name": "Санкт-Петербург", "country": "Россия", "latitude": 59.9343, "longitude": 30.3351, "timezone": "Europe/Moscow"},
    {"name": "Новосибирск", "country": "Россия", "latitude": 55.0084, "longitude": 82.9357, "timezone": "Asia/Novosibirsk"},
    {"name": "Екатеринбург", "country": "Россия", "latitude": 56.8389, "longitude": 60.6057, "timezone": "Asia/Yekaterinburg"},
    {"name": "Казань", "country": "Россия", "latitude": 55.7887, "longitude": 49.1221, "timezone": "Europe/Moscow"},
    {"name": "Нижний Новгород", "country": "Россия", "latitude": 56.3269, "longitude": 44.0059, "timezone": "Europe/Moscow"},
    {"name": "Красноярск", "country": "Россия", "latitude": 56.0153, "longitude": 92.8932, "timezone": "Asia/Krasnoyarsk"},
    {"name": "Самара", "country": "Россия", "latitude": 53.1959, "longitude": 50.1002, "timezone": "Europe/Samara"},
    {"name": "Уфа", "country": "Россия", "latitude": 54.7388, "longitude": 55.9721, "timezone": "Asia/Yekaterinburg"},
    {"name": "Ростов-на-Дону", "country": "Россия", "latitude": 47.2357, "longitude": 39.7015, "timezone": "Europe/Moscow"},
    {"name": "Краснодар", "country": "Россия", "latitude": 45.0393, "longitude": 38.9872, "timezone": "Europe/Moscow"},
    {"name": "Сочи", "country": "Россия", "latitude": 43.6028, "longitude": 39.7342, "timezone": "Europe/Moscow"},
    {"name": "Владивосток", "country": "Россия", "latitude": 43.1155, "longitude": 131.8855, "timezone": "Asia/Vladivostok"},
    {"name": "Калининград", "country": "Россия", "latitude": 54.7104, "longitude": 20.4522, "timezone": "Europe/Kaliningrad"},
    {"name": "Минск", "country": "Беларусь", "latitude": 53.9006, "longitude": 27.5590, "timezone": "Europe/Minsk"},
    {"name": "Алматы", "country": "Казахстан", "latitude": 43.2220, "longitude": 76.8512, "timezone": "Asia/Almaty"},
    {"name": "Астана", "country": "Казахстан", "latitude": 51.1694, "longitude": 71.4491, "timezone": "Asia/Almaty"},
    {"name": "Ташкент", "country": "Узбекистан", "latitude": 41.2995, "longitude": 69.2401, "timezone": "Asia/Tashkent"},
    {"name": "Тбилиси", "country": "Грузия", "latitude": 41.7151, "longitude": 44.8271, "timezone": "Asia/Tbilisi"},
    {"name": "Ереван", "country": "Армения", "latitude": 40.1792, "longitude": 44.4991, "timezone": "Asia/Yerevan"},
    {"name": "Баку", "country": "Азербайджан", "latitude": 40.4093, "longitude": 49.8671, "timezone": "Asia/Baku"},
    {"name": "Бишкек", "country": "Кыргызстан", "latitude": 42.8746, "longitude": 74.5698, "timezone": "Asia/Bishkek"},
    {"name": "Киев", "country": "Украина", "latitude": 50.4501, "longitude": 30.5234, "timezone": "Europe/Kyiv"},
    {"name": "Лондон", "country": "Великобритания", "latitude": 51.5074, "longitude": -0.1278, "timezone": "Europe/London"},
    {"name": "Париж", "country": "Франция", "latitude": 48.8566, "longitude": 2.3522, "timezone": "Europe/Paris"},
    {"name": "Берлин", "country": "Германия", "latitude": 52.5200, "longitude": 13.4050, "timezone": "Europe/Berlin"},
    {"name": "Нью-Йорк", "country": "США", "latitude": 40.7128, "longitude": -74.0060, "timezone": "America/New_York"},
    {"name": "Лос-Анджелес", "country": "США", "latitude": 34.0522, "longitude": -118.2437, "timezone": "America/Los_Angeles"},
    {"name": "Дубай", "country": "ОАЭ", "latitude": 25.2048, "longitude": 55.2708, "timezone": "Asia/Dubai"},
    {"name": "Токио", "country": "Япония", "latitude": 35.6762, "longitude": 139.6503, "timezone": "Asia/Tokyo"},
]

_CACHE: dict[str, list[dict[str, Any]]] = {}


def search_city(query: str, limit: int = 6) -> list[dict[str, Any]]:
    q = query.strip()
    if not q:
        return POPULAR_CITIES[:limit]

    cache_key = q.lower()
    if cache_key in _CACHE:
        return _CACHE[cache_key]

    # Check local popular cities first
    local_matches = [
        c for c in POPULAR_CITIES
        if q.lower() in c["name"].lower() or q.lower() in c["country"].lower()
    ]

    try:
        resp = requests.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            params={
                "name": q,
                "count": limit,
                "language": "ru",
                "format": "json",
            },
            timeout=4.0,
        )
        if resp.ok:
            data = resp.json()
            results = []
            for item in data.get("results", []):
                results.append({
                    "name": item.get("name"),
                    "country": item.get("country", ""),
                    "admin1": item.get("admin1", ""),
                    "latitude": round(float(item.get("latitude")), 4),
                    "longitude": round(float(item.get("longitude")), 4),
                    "timezone": item.get("timezone", "Europe/Moscow"),
                })
            if results:
                # Deduplicate with local matches
                combined = []
                seen = set()
                for item in results + local_matches:
                    key = (round(item["latitude"], 2), round(item["longitude"], 2))
                    if key not in seen:
                        seen.add(key)
                        combined.append(item)
                _CACHE[cache_key] = combined[:limit]
                return combined[:limit]
    except Exception:
        pass

    if local_matches:
        _CACHE[cache_key] = local_matches[:limit]
        return local_matches[:limit]

    return []
