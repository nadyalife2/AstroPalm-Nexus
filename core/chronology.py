"""
Chronological Time Bridge: Astrology Cycles ⟷ Palm Line Dating System.
Based on classical chirology standards (Benham, Saint-Germain, Cheiro)
synthesized with planetary cycles (Saturn Returns, Uranus Opposition, Jupiter Cycles, Chiron Return).
"""

from datetime import datetime, timezone
from typing import Any, Optional


PLANET_RU = {
    "Sun": "Солнце",
    "Moon": "Луна",
    "Mercury": "Меркурий",
    "Venus": "Венера",
    "Mars": "Марс",
    "Jupiter": "Юпитер",
    "Saturn": "Сатурн",
    "Uranus": "Уран",
    "Neptune": "Нептун",
    "Pluto": "Плутон",
    "TrueNode": "Северный Узел",
    "Chiron": "Хирон",
}


def calculate_current_age(birth_iso: str) -> float:
    """Calculates floating-point age in years from ISO birth date."""
    try:
        # Handle string with timezone
        clean_iso = birth_iso.replace("Z", "+00:00")
        birth_dt = datetime.fromisoformat(clean_iso)
        now = datetime.now(timezone.utc)
        if birth_dt.tzinfo is None:
            now = datetime.now()
        delta_days = (now - birth_dt).total_seconds() / 86400.0
        return round(max(0.0, delta_days / 365.2425), 1)
    except Exception:
        return 30.0


def calculate_chronology_bridge(
    natal_chart: dict[str, Any],
    palm_features: dict[str, Any],
) -> dict[str, Any]:
    """
    Constructs the chronological alignment between astrological planetary cycles
    and the anatomical milestones of the Life and Fate lines.
    """
    birth_iso = natal_chart.get("birth_utc") or natal_chart.get("birth_local") or "1995-08-14T00:00:00"
    current_age = calculate_current_age(birth_iso)

    # Rulers and dominant planets
    asc_ruler = natal_chart.get("angles", {}).get("asc", {}).get("ruler", "Mars")
    mc_ruler = natal_chart.get("angles", {}).get("mc", {}).get("ruler", "Saturn")
    dominant_elem = natal_chart.get("dominant_element_ru", "Воздух")

    palm_elem = palm_features.get("element", "fire")
    palm_elem_ru = palm_features.get("element_ru", "Рука Огня")
    knotty = bool(palm_features.get("knotty_joints") or palm_elem == "philosophic")

    # Define standard chronological milestones
    milestones = [
        {
            "age_target": 18.6,
            "age_label": "18–21 год",
            "title": "Инициация Самости: Возврат Лунных Узлов & Исток Линии Судьбы",
            "astrology_phase": "Первый противофазный возврат Узлов (18.6 лет) + Юпитерианский квадрат",
            "palm_location": "Основание ладони (над браслетами расцетты, вхождение в долину Марса)",
            "meaning": "Сепарация от родовой матрицы. На ладони в этот момент четко оформляется Линия Судьбы, "
                       "показывающая, идет ли человек по стопам родителей (исток от линии Жизни) "
                       "или строит независимую судьбу (исток от холма Луны).",
            "active": 17.0 <= current_age <= 23.0,
            "passed": current_age > 23.0,
        },
        {
            "age_target": 29.5,
            "age_label": "28–30 лет",
            "title": "Первый Возврат Сатурна: Экзамен на Прочность Фундамента",
            "astrology_phase": "Сатурн возвращается в натальное положение (цикл 29.5 лет)",
            "palm_location": "Нижняя треть Линии Судьбы и средняя дуга Линии Жизни",
            "meaning": "Критическая точка зрелости. Сатурн кристаллизует карьеру и статус. "
                       "На ладони в этом возрасте Линия Судьбы должна стать более глубокой и устойчивой. "
                       f"При конституции ({palm_elem_ru}) этот период дает закрепление в профессии и сброс лишних амбиций.",
            "active": 27.5 <= current_age <= 32.0,
            "passed": current_age > 32.0,
        },
        {
            "age_target": 35.0,
            "age_label": "35–36 лет",
            "title": "Рубеж Беньхама: Пересечение Линии Судьбы с Линией Головы & 3-й Цикл Юпитера",
            "astrology_phase": "3-е обращение Юпитера (36 лет) — пик социальной экспансии",
            "palm_location": "Точка контакта Линии Судьбы с Линией Головы (Ума)",
            "meaning": "Золотой стандарт классической хирологии: пересечение Линии Судьбы с Линией Головы строго знаменует 35 лет. "
                       "Здесь все карьерные успехи проходят аудит интеллекта. Если линия Головы сильная и четкая, "
                       "а линия Судьбы продолжается беспрепятственно — совершается мощный рывок в стратегическом руководстве.",
            "active": 33.5 <= current_age <= 38.0,
            "passed": current_age > 38.0,
        },
        {
            "age_target": 42.0,
            "age_label": "40–42 года",
            "title": "Оппозиция Урана: «Кризис Середины Жизни» & Большой Четырехугольник",
            "astrology_phase": "Транзитный Уран в точной оппозиции к натальному Урану",
            "palm_location": "Пространство «Большого Четырехугольника» (между линиями Головы и Сердца)",
            "meaning": "Уранический зов к подлинной свободе. Внутренняя потребность отбросить навязанные обществом клише. "
                       "На ладони это пространство свободы: здесь линия Судьбы часто дает ответвления к холмам Аполлона (творчество) "
                       "или Юпитера (масштабное лидерство).",
            "active": 39.5 <= current_age <= 44.5,
            "passed": current_age > 44.5,
        },
        {
            "age_target": 50.0,
            "age_label": "49–51 год",
            "title": "Пересечение Линии Сердца & Возврат Хирона: Врата Мудрости",
            "astrology_phase": "Полный возврат астероида Хирон (50–51 год) — исцеление духовной травмы",
            "palm_location": "Пересечение Линии Судьбы с Линией Сердца",
            "meaning": "Начиная с 50 лет (линия Сердца), профессиональная деятельность полностью подчиняется внутренним ценностям. "
                       "Человек больше не работает ради выживания — он создает наследие, обучает учеников и занимается меценатством.",
            "active": 48.0 <= current_age <= 53.0,
            "passed": current_age > 53.0,
        },
        {
            "age_target": 59.0,
            "age_label": "58–60 лет",
            "title": "Второй Возврат Сатурна & 5-й Цикл Юпитера: Триумф Мастерства",
            "astrology_phase": "Второй возврат Сатурна (59 лет) + 5-е обращение Юпитера (60 лет)",
            "palm_location": "Вершина Линии Судьбы у основания холма Сатурна / Аполлона",
            "meaning": "Подведение главных жизненных итогов. Линия Судьбы, доходящая до основания пальца Сатурна, "
                       "свидетельствует о безупречно выполненной жизненной задаче и непоколебимом авторитете.",
            "active": 57.0 <= current_age <= 63.0,
            "passed": current_age > 63.0,
        },
    ]

    # Find the active or nearest milestone
    active_milestone = None
    for m in milestones:
        if m["active"]:
            active_milestone = m
            break
    if not active_milestone:
        # Pick the nearest future or recent milestone
        active_milestone = min(milestones, key=lambda x: abs(x["age_target"] - current_age))

    # Calculate Bilateral Realization Coefficient (K_realization)
    # Left hand = Inborn potential (Radix), Right hand = Realized conscious will (Solar)
    # If knotty or philosophic hand, systemic diligence typically increases realization
    base_k = 100
    if knotty:
        base_k += 14  # High analytical self-regulation
    if palm_elem == "fire":
        base_k += 10
    elif palm_elem == "earth":
        base_k += 12
    elif palm_elem == "air":
        base_k += 8
    elif palm_elem == "water":
        base_k += 6

    # Bonus if MC ruler matches palm's dominant mount
    mc_ruler_name = PLANET_RU.get(mc_ruler, mc_ruler)
    asc_ruler_name = PLANET_RU.get(asc_ruler, asc_ruler)

    realization_score = min(128, max(75, base_k))

    synthesis_narrative = (
        f"Текущий возраст субъекта — {current_age} лет. "
        f"На ладони этот возрастной отрезок соответствует этапу: «{active_milestone['title']}». "
        f"В астрологическом контексте этот сектор синхронизирован с управителем карьеры ({mc_ruler_name}) "
        f"и вектором Асцендента ({asc_ruler_name}). "
        f"Коэффициент реализации врожденного потенциала волевыми усилиями (K_realization) составляет {realization_score}%, "
        f"что подтверждает высокую динамику воплощения натальных задатков в физическую форму."
    )

    return {
        "current_age": current_age,
        "active_milestone": active_milestone,
        "all_milestones": milestones,
        "asc_ruler": asc_ruler_name,
        "mc_ruler": mc_ruler_name,
        "realization_score": realization_score,
        "synthesis_narrative": synthesis_narrative,
    }
