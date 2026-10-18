import math
from datetime import datetime
from typing import Any, Optional
from zoneinfo import ZoneInfo
import swisseph as swe

SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer",
    "Leo", "Virgo", "Libra", "Scorpio",
    "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

SIGNS_RU = {
    "Aries": "Овен", "Taurus": "Телец", "Gemini": "Близнецы", "Cancer": "Рак",
    "Leo": "Лев", "Virgo": "Дева", "Libra": "Весы", "Scorpio": "Скорпион",
    "Sagittarius": "Стрелец", "Capricorn": "Козерог", "Aquarius": "Водолей", "Pisces": "Рыбы"
}

ZODIAC_SYMBOLS = {
    "Aries": "♈", "Taurus": "♉", "Gemini": "♊", "Cancer": "♋",
    "Leo": "♌", "Virgo": "♍", "Libra": "♎", "Scorpio": "♏",
    "Sagittarius": "♐", "Capricorn": "♑", "Aquarius": "♒", "Pisces": "♓"
}

ELEMENTS = {
    "Aries": "fire", "Leo": "fire", "Sagittarius": "fire",
    "Taurus": "earth", "Virgo": "earth", "Capricorn": "earth",
    "Gemini": "air", "Libra": "air", "Aquarius": "air",
    "Cancer": "water", "Scorpio": "water", "Pisces": "water",
}

ELEMENTS_RU = {
    "fire": "Огонь", "earth": "Земля", "air": "Воздух", "water": "Вода"
}

QUALITIES = {
    "Aries": "cardinal", "Cancer": "cardinal", "Libra": "cardinal", "Capricorn": "cardinal",
    "Taurus": "fixed", "Leo": "fixed", "Scorpio": "fixed", "Aquarius": "fixed",
    "Gemini": "mutable", "Virgo": "mutable", "Sagittarius": "mutable", "Pisces": "mutable",
}

QUALITIES_RU = {
    "cardinal": "Кардинальный", "fixed": "Фиксированный", "mutable": "Мутабельный"
}

RULERS = {
    "Aries": "Mars", "Taurus": "Venus", "Gemini": "Mercury", "Cancer": "Moon",
    "Leo": "Sun", "Virgo": "Mercury", "Libra": "Venus", "Scorpio": "Pluto",
    "Sagittarius": "Jupiter", "Capricorn": "Saturn", "Aquarius": "Uranus", "Pisces": "Neptune",
}

PLANET_SYMBOLS = {
    "Sun": "☉", "Moon": "☽", "Mercury": "☿", "Venus": "♀", "Mars": "♂",
    "Jupiter": "♃", "Saturn": "♄", "Uranus": "♅", "Neptune": "♆", "Pluto": "♇",
    "North Node": "☊", "Chiron": "⚷"
}

PLANET_RU = {
    "Sun": "Солнце", "Moon": "Луна", "Mercury": "Меркурий", "Venus": "Венера", "Mars": "Марс",
    "Jupiter": "Юпитер", "Saturn": "Сатурн", "Uranus": "Уран", "Neptune": "Нептун", "Pluto": "Плутон",
    "North Node": "Северный Узел", "Chiron": "Хирон"
}

SW_PLANETS = {
    "Sun": getattr(swe, "SUN", 0),
    "Moon": getattr(swe, "MOON", 1),
    "Mercury": getattr(swe, "MERCURY", 2),
    "Venus": getattr(swe, "VENUS", 3),
    "Mars": getattr(swe, "MARS", 4),
    "Jupiter": getattr(swe, "JUPITER", 5),
    "Saturn": getattr(swe, "SATURN", 6),
    "Uranus": getattr(swe, "URANUS", 7),
    "Neptune": getattr(swe, "NEPTUNE", 8),
    "Pluto": getattr(swe, "PLUTO", 9),
    "North Node": getattr(swe, "MEAN_NODE", 10),
    "Chiron": getattr(swe, "CHIRON", 15),
}

DIGNITIES = {
    "Sun": {"domicile": ["Leo"], "exaltation": ["Aries"], "detriment": ["Aquarius"], "fall": ["Libra"]},
    "Moon": {"domicile": ["Cancer"], "exaltation": ["Taurus"], "detriment": ["Capricorn"], "fall": ["Scorpio"]},
    "Mercury": {"domicile": ["Gemini", "Virgo"], "exaltation": ["Virgo"], "detriment": ["Sagittarius", "Pisces"], "fall": ["Pisces"]},
    "Venus": {"domicile": ["Taurus", "Libra"], "exaltation": ["Pisces"], "detriment": ["Scorpio", "Aries"], "fall": ["Virgo"]},
    "Mars": {"domicile": ["Aries", "Scorpio"], "exaltation": ["Capricorn"], "detriment": ["Libra", "Taurus"], "fall": ["Cancer"]},
    "Jupiter": {"domicile": ["Sagittarius", "Pisces"], "exaltation": ["Cancer"], "detriment": ["Gemini", "Virgo"], "fall": ["Capricorn"]},
    "Saturn": {"domicile": ["Capricorn", "Aquarius"], "exaltation": ["Libra"], "detriment": ["Cancer", "Leo"], "fall": ["Aries"]},
}

ASPECTS = [
    {"name": "Conjunction", "name_ru": "Соединение", "angle": 0.0, "orb": 7.0, "symbol": "☌", "harmonic": "neutral"},
    {"name": "Sextile", "name_ru": "Секстиль", "angle": 60.0, "orb": 5.0, "symbol": "⚹", "harmonic": "soft"},
    {"name": "Square", "name_ru": "Квадратура", "angle": 90.0, "orb": 6.0, "symbol": "□", "harmonic": "hard"},
    {"name": "Trine", "name_ru": "Трин", "angle": 120.0, "orb": 7.0, "symbol": "△", "harmonic": "soft"},
    {"name": "Opposition", "name_ru": "Оппозиция", "angle": 180.0, "orb": 7.0, "symbol": "☍", "harmonic": "hard"},
]

FLG_MOSEPH = getattr(swe, "FLG_MOSEPH", 4)
FLG_SWIEPH = getattr(swe, "FLG_SWIEPH", 2)
FLG_SPEED = getattr(swe, "FLG_SPEED", 256)
CALC_FLAGS = FLG_SWIEPH | FLG_SPEED
FALLBACK_FLAGS = FLG_MOSEPH | FLG_SPEED


def _calc_planet_safe(jd: float, p_id: int):
    try:
        res = swe.calc_ut(jd, p_id, CALC_FLAGS)
        pos = res[0]
        return float(pos[0]), float(pos[3])
    except Exception:
        res = swe.calc_ut(jd, p_id, FALLBACK_FLAGS)
        pos = res[0]
        return float(pos[0]), float(pos[3])



def sign_from_longitude(lon: float) -> tuple[str, float]:
    lon = float(lon) % 360.0
    idx = int(lon // 30.0)
    return SIGNS[idx], lon - idx * 30.0


def format_degree(degree_in_sign: float) -> str:
    d = int(degree_in_sign)
    m = int(round((degree_in_sign - d) * 60))
    if m >= 60:
        d += 1
        m -= 60
    return f"{d}°{m:02d}'"


def get_planet_dignity(planet: str, sign: str) -> Optional[str]:
    d = DIGNITIES.get(planet)
    if not d:
        return None
    if sign in d["domicile"]:
        return "domicile"
    if sign in d["exaltation"]:
        return "exaltation"
    if sign in d["detriment"]:
        return "detriment"
    if sign in d["fall"]:
        return "fall"
    return "neutral"


def jd_from_local(
    year: int, month: int, day: int, hour: int, minute: int, timezone: str
) -> tuple[float, str, str]:
    local_dt = datetime(year, month, day, hour, minute, tzinfo=ZoneInfo(timezone))
    utc_dt = local_dt.astimezone(ZoneInfo("UTC"))
    ut_hour = (
        utc_dt.hour
        + utc_dt.minute / 60.0
        + utc_dt.second / 3600.0
        + utc_dt.microsecond / 3_600_000_000.0
    )
    jd = swe.julday(utc_dt.year, utc_dt.month, utc_dt.day, ut_hour)
    return jd, local_dt.isoformat(), utc_dt.isoformat()


def jd_to_local_datetime(jd: float, timezone: str) -> datetime:
    year, month, day, hour_float = swe.revjul(jd)
    h = int(hour_float)
    minute_float = (hour_float - h) * 60.0
    m = int(minute_float)
    sec_float = (minute_float - m) * 60.0
    s = int(sec_float)
    microsec = int(round((sec_float - s) * 1_000_000))
    if microsec >= 1_000_000:
        s += 1
        microsec -= 1_000_000
    if s >= 60:
        m += 1
        s -= 60
    if m >= 60:
        h += 1
        m -= 60
    utc_dt = datetime(year, month, day, h, m, s, microsec, tzinfo=ZoneInfo("UTC"))
    return utc_dt.astimezone(ZoneInfo(timezone))


def angular_distance(a: float, b: float) -> float:
    diff = abs((float(a) - float(b)) % 360.0)
    return min(diff, 360.0 - diff)


def house_for_longitude(lon: float, cusps: list[float]) -> int:
    """cusps is a 1-indexed list (index 1 to 12) or 0-indexed 12 cusps"""
    if len(cusps) == 13:
        c = cusps[1:]
    else:
        c = cusps
    lon = float(lon) % 360.0
    for i in range(12):
        start = c[i]
        end = c[(i + 1) % 12]
        if start <= end:
            if start <= lon < end:
                return i + 1
        else:
            if lon >= start or lon < end:
                return i + 1
    return 1


def calculate_chart(
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
    jd, local_iso, utc_iso = jd_from_local(year, month, day, hour, minute, timezone)

    # 1. Houses and Angles
    h_sys = (house_system or "P").strip().upper()[:1].encode("ascii")
    cusps_raw, ascmc_raw = swe.houses(jd, latitude, longitude, h_sys)
    cusps = [float(x) % 360.0 for x in cusps_raw[:12]]
    asc_lon = float(ascmc_raw[0]) % 360.0
    mc_lon = float(ascmc_raw[1]) % 360.0
    dsc_lon = (asc_lon + 180.0) % 360.0
    ic_lon = (mc_lon + 180.0) % 360.0

    asc_sign, asc_deg = sign_from_longitude(asc_lon)
    mc_sign, mc_deg = sign_from_longitude(mc_lon)

    # 2. Planet Positions
    planets = []
    element_counts = {"fire": 0, "earth": 0, "air": 0, "water": 0}
    quality_counts = {"cardinal": 0, "fixed": 0, "mutable": 0}

    for p_name, p_id in SW_PLANETS.items():
        try:
            lon_raw, speed_raw = _calc_planet_safe(jd, p_id)
            lon = lon_raw % 360.0
            speed = speed_raw
            sign, deg_in_sign = sign_from_longitude(lon)
            house_num = house_for_longitude(lon, cusps)
            element = ELEMENTS.get(sign, "unknown")
            quality = QUALITIES.get(sign, "unknown")
            dignity = get_planet_dignity(p_name, sign)

            if p_name in ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"]:
                if element in element_counts:
                    element_counts[element] += 1
                if quality in quality_counts:
                    quality_counts[quality] += 1

            planets.append({
                "name": p_name,
                "name_ru": PLANET_RU.get(p_name, p_name),
                "symbol": PLANET_SYMBOLS.get(p_name, "●"),
                "longitude": round(lon, 4),
                "sign": sign,
                "sign_ru": SIGNS_RU.get(sign, sign),
                "sign_symbol": ZODIAC_SYMBOLS.get(sign, ""),
                "degree_in_sign": round(deg_in_sign, 4),
                "degree_formatted": format_degree(deg_in_sign),
                "house": house_num,
                "element": element,
                "element_ru": ELEMENTS_RU.get(element, element),
                "quality": quality,
                "quality_ru": QUALITIES_RU.get(quality, quality),
                "speed": round(speed, 5),
                "retrograde": bool(speed < 0),
                "dignity": dignity,
            })
        except Exception as e:
            planets.append({
                "name": p_name,
                "name_ru": PLANET_RU.get(p_name, p_name),
                "error": str(e)
            })

    # 3. House structures
    houses = []
    for i in range(12):
        c_lon = cusps[i]
        c_sign, c_deg = sign_from_longitude(c_lon)
        houses.append({
            "number": i + 1,
            "longitude": round(c_lon, 4),
            "sign": c_sign,
            "sign_ru": SIGNS_RU.get(c_sign, c_sign),
            "sign_symbol": ZODIAC_SYMBOLS.get(c_sign, ""),
            "degree_formatted": format_degree(c_deg),
            "ruler": RULERS.get(c_sign, ""),
        })

    # 4. Aspects
    aspects = []
    for i in range(len(planets)):
        p1 = planets[i]
        if "longitude" not in p1:
            continue
        for j in range(i + 1, len(planets)):
            p2 = planets[j]
            if "longitude" not in p2:
                continue
            ang = angular_distance(p1["longitude"], p2["longitude"])
            for asp in ASPECTS:
                orb = abs(ang - asp["angle"])
                max_orb = asp["orb"]
                # Give slightly wider orb to Sun & Moon
                if p1["name"] in ["Sun", "Moon"] or p2["name"] in ["Sun", "Moon"]:
                    max_orb += 1.5
                if orb <= max_orb:
                    aspects.append({
                        "planet1": p1["name"],
                        "planet1_ru": p1["name_ru"],
                        "planet1_symbol": p1["symbol"],
                        "planet2": p2["name"],
                        "planet2_ru": p2["name_ru"],
                        "planet2_symbol": p2["symbol"],
                        "aspect": asp["name"],
                        "aspect_ru": asp["name_ru"],
                        "aspect_symbol": asp["symbol"],
                        "harmonic": asp["harmonic"],
                        "angle": round(ang, 2),
                        "exact_angle": asp["angle"],
                        "orb": round(orb, 2),
                    })
                    break

    aspects.sort(key=lambda x: x["orb"])

    dominant_element = max(element_counts, key=element_counts.get)
    dominant_quality = max(quality_counts, key=quality_counts.get)

    return {
        "name": name,
        "birth_local": local_iso,
        "birth_utc": utc_iso,
        "timezone": timezone,
        "latitude": latitude,
        "longitude": longitude,
        "julian_day": round(jd, 6),
        "angles": {
            "asc": {
                "longitude": round(asc_lon, 4),
                "sign": asc_sign,
                "sign_ru": SIGNS_RU.get(asc_sign, asc_sign),
                "sign_symbol": ZODIAC_SYMBOLS.get(asc_sign, ""),
                "degree_formatted": format_degree(asc_deg),
                "ruler": RULERS.get(asc_sign, ""),
                "element": ELEMENTS.get(asc_sign, ""),
            },
            "mc": {
                "longitude": round(mc_lon, 4),
                "sign": mc_sign,
                "sign_ru": SIGNS_RU.get(mc_sign, mc_sign),
                "sign_symbol": ZODIAC_SYMBOLS.get(mc_sign, ""),
                "degree_formatted": format_degree(mc_deg),
                "ruler": RULERS.get(mc_sign, ""),
                "element": ELEMENTS.get(mc_sign, ""),
            },
            "dsc": {"longitude": round(dsc_lon, 4)},
            "ic": {"longitude": round(ic_lon, 4)},
        },
        "planets": planets,
        "houses": houses,
        "aspects": aspects,
        "elements": element_counts,
        "qualities": quality_counts,
        "dominant_element": dominant_element,
        "dominant_element_ru": ELEMENTS_RU.get(dominant_element, dominant_element),
        "dominant_quality": dominant_quality,
        "dominant_quality_ru": QUALITIES_RU.get(dominant_quality, dominant_quality),
    }


def calculate_transits(
    natal_chart: dict[str, Any],
    transit_year: int,
    transit_month: int,
    transit_day: int,
    transit_hour: int = 12,
    transit_minute: int = 0,
    timezone: str = "Europe/Moscow",
    max_orb: float = 3.0,
) -> dict[str, Any]:
    jd, local_iso, utc_iso = jd_from_local(
        transit_year, transit_month, transit_day, transit_hour, transit_minute, timezone
    )

    transit_planets = []
    transit_aspects = []

    for p_name, p_id in SW_PLANETS.items():
        if p_name in ["North Node", "Chiron"]:
            continue
        try:
            lon_raw, _ = _calc_planet_safe(jd, p_id)
            lon = lon_raw % 360.0
            sign, deg_in_sign = sign_from_longitude(lon)
            transit_planets.append({
                "name": p_name,
                "name_ru": PLANET_RU.get(p_name, p_name),
                "symbol": PLANET_SYMBOLS.get(p_name, "●"),
                "longitude": round(lon, 4),
                "sign": sign,
                "sign_ru": SIGNS_RU.get(sign, sign),
                "degree_formatted": format_degree(deg_in_sign),
            })
        except Exception:
            continue

    natal_planets = [p for p in natal_chart.get("planets", []) if "longitude" in p]

    for tp in transit_planets:
        for np in natal_planets:
            ang = angular_distance(tp["longitude"], np["longitude"])
            for asp in ASPECTS:
                orb = abs(ang - asp["angle"])
                if orb <= max_orb:
                    transit_aspects.append({
                        "transit_planet": tp["name"],
                        "transit_planet_ru": tp["name_ru"],
                        "transit_symbol": tp["symbol"],
                        "transit_longitude": tp["longitude"],
                        "natal_planet": np["name"],
                        "natal_planet_ru": np["name_ru"],
                        "natal_symbol": np["symbol"],
                        "natal_longitude": np["longitude"],
                        "aspect": asp["name"],
                        "aspect_ru": asp["name_ru"],
                        "aspect_symbol": asp["symbol"],
                        "harmonic": asp["harmonic"],
                        "orb": round(orb, 2),
                    })
                    break

    transit_aspects.sort(key=lambda x: x["orb"])

    return {
        "transit_date": f"{transit_year}-{transit_month:02d}-{transit_day:02d}",
        "transit_datetime_local": local_iso,
        "transit_planets": transit_planets,
        "aspects": transit_aspects,
    }


def calculate_transit_range(
    natal_chart: dict[str, Any],
    start_date_str: str,
    end_date_str: str,
    timezone: str = "Europe/Moscow",
    step_hours: int = 4,
    max_orb: float = 2.0,
    limit: int = 50,
) -> dict[str, Any]:
    start_dt = datetime.fromisoformat(start_date_str).replace(tzinfo=ZoneInfo(timezone))
    end_dt = datetime.fromisoformat(end_date_str).replace(tzinfo=ZoneInfo(timezone))

    start_jd, _, _ = jd_from_local(start_dt.year, start_dt.month, start_dt.day, start_dt.hour, start_dt.minute, timezone)
    end_jd, _, _ = jd_from_local(end_dt.year, end_dt.month, end_dt.day, end_dt.hour, end_dt.minute, timezone)

    step_days = step_hours / 24.0
    natal_planets = [p for p in natal_chart.get("planets", []) if "longitude" in p and p["name"] not in ["North Node", "Chiron"]]

    # We test key transit bodies (Jupiter, Saturn, Uranus, Neptune, Pluto, Mars, Sun, Venus, Mercury)
    test_transit_names = ["Pluto", "Neptune", "Uranus", "Saturn", "Jupiter", "Mars", "Sun", "Venus"]

    peaks = []
    
    for t_name in test_transit_names:
        p_id = SW_PLANETS[t_name]
        for np in natal_planets:
            n_lon = np["longitude"]
            for asp in ASPECTS:
                asp_angle = asp["angle"]
                allowed_orb = min(asp["orb"], max_orb)
                
                # Sample along timeline
                cur_jd = start_jd
                in_aspect = False
                cluster = []
                
                while cur_jd <= end_jd:
                    try:
                        lon_raw, _ = _calc_planet_safe(cur_jd, p_id)
                        t_lon = lon_raw % 360.0
                        diff = angular_distance(t_lon, n_lon)
                        orb = abs(diff - asp_angle)
                        
                        if orb <= allowed_orb + 1.0:
                            cluster.append((cur_jd, orb))
                            in_aspect = True
                        else:
                            if in_aspect and cluster:
                                # find local minimum
                                best_sample = min(cluster, key=lambda x: x[1])
                                if best_sample[1] <= allowed_orb:
                                    best_dt = jd_to_local_datetime(best_sample[0], timezone)
                                    peaks.append({
                                        "date": best_dt.strftime("%Y-%m-%d"),
                                        "datetime_local": best_dt.strftime("%Y-%m-%d %H:%M"),
                                        "transit_planet": t_name,
                                        "transit_planet_ru": PLANET_RU.get(t_name, t_name),
                                        "transit_symbol": PLANET_SYMBOLS.get(t_name, "●"),
                                        "natal_planet": np["name"],
                                        "natal_planet_ru": np["name_ru"],
                                        "natal_symbol": np["symbol"],
                                        "aspect": asp["name"],
                                        "aspect_ru": asp["name_ru"],
                                        "aspect_symbol": asp["symbol"],
                                        "harmonic": asp["harmonic"],
                                        "orb": round(best_sample[1], 2),
                                    })
                                cluster = []
                                in_aspect = False
                    except Exception:
                        pass
                    cur_jd += step_days

                if cluster:
                    best_sample = min(cluster, key=lambda x: x[1])
                    if best_sample[1] <= allowed_orb:
                        best_dt = jd_to_local_datetime(best_sample[0], timezone)
                        peaks.append({
                            "date": best_dt.strftime("%Y-%m-%d"),
                            "datetime_local": best_dt.strftime("%Y-%m-%d %H:%M"),
                            "transit_planet": t_name,
                            "transit_planet_ru": PLANET_RU.get(t_name, t_name),
                            "transit_symbol": PLANET_SYMBOLS.get(t_name, "●"),
                            "natal_planet": np["name"],
                            "natal_planet_ru": np["name_ru"],
                            "natal_symbol": np["symbol"],
                            "aspect": asp["name"],
                            "aspect_ru": asp["name_ru"],
                            "aspect_symbol": asp["symbol"],
                            "harmonic": asp["harmonic"],
                            "orb": round(best_sample[1], 2),
                        })

    peaks.sort(key=lambda x: (x["date"], x["orb"]))
    # Group by date
    days_dict = {}
    for p in peaks[:limit]:
        d = p["date"]
        if d not in days_dict:
            days_dict[d] = {"date": d, "aspects": [], "count": 0, "best_orb": p["orb"]}
        days_dict[d]["aspects"].append(p)
        days_dict[d]["count"] += 1
        if p["orb"] < days_dict[d]["best_orb"]:
            days_dict[d]["best_orb"] = p["orb"]

    peak_days = sorted(list(days_dict.values()), key=lambda x: x["date"])

    return {
        "start_date": start_date_str,
        "end_date": end_date_str,
        "peak_aspects": peaks[:limit],
        "peak_days": peak_days,
    }
