from typing import Any, Optional
from core.chronology import calculate_chronology_bridge
from core.palmistry import classify_benham_archetype, analyze_three_worlds_and_thumb

CORRESPONDENCE_MAP = {
    "mounts": {
        "jupiter": {"planet": "Jupiter", "qualities": "Лидерство, авторитет, амбиции, мировоззрение"},
        "saturn": {"planet": "Saturn", "qualities": "Дисциплина, глубина, кармическая зрелость, фокус"},
        "apollo": {"planet": "Sun", "qualities": "Творческая витальность, харизма, самовыражение"},
        "mercury": {"planet": "Mercury", "qualities": "Интеллект, аналитика, красноречие, предприимчивость"},
        "venus": {"planet": "Venus", "qualities": "Любовь, эстетика, гармония, телесный комфорт"},
        "moon": {"planet": "Moon", "qualities": "Интуиция, восприимчивость, воображение, эмпатия"},
        "mars_upper": {"planet": "Mars", "qualities": "Выносливость, стойкость духа, терпение в борьбе"},
        "mars_lower": {"planet": "Mars", "qualities": "Инициатива, смелость первого шага, напор"},
    },
    "lines": {
        "life": {"house": 1, "planet": "Mars/Sun", "theme": "Витальность, здоровье, тело и проявление в мире"},
        "head": {"house": 3, "planet": "Mercury", "theme": "Мышление, ментальная гибкость, концентрация"},
        "heart": {"house": 5, "planet": "Venus", "theme": "Сердечность, привязанность, романтический потенциал"},
        "fate": {"house": 10, "planet": "Saturn", "theme": "Призвание, карьерный вектор, социальное восхождение"},
        "sun": {"house": 10, "planet": "Sun", "theme": "Успех, известность, творческая слава"},
        "mercury": {"house": 3, "planet": "Mercury", "theme": "Коммерческое чутье, психологическая интуиция"},
    }
}


def synthesize_reading(
    natal_chart: dict[str, Any],
    palm_features: dict[str, Any],
    question: Optional[str] = None,
) -> dict[str, Any]:
    """
    Synthesizes western astrology natal chart with traditional palmistry.
    Generates convergence points, creative contradictions, resonance scores,
    and structured holistic guidance.
    """
    astro_elem = natal_chart.get("dominant_element", "air")
    astro_elem_ru = natal_chart.get("dominant_element_ru", "Воздух")
    astro_qual = natal_chart.get("dominant_quality_ru", "Кардинальный")
    
    asc = natal_chart.get("angles", {}).get("asc", {})
    asc_sign = asc.get("sign_ru", "Овен")
    asc_elem = asc.get("element", "fire")
    
    planets = {p["name"]: p for p in natal_chart.get("planets", []) if "name" in p}
    sun = planets.get("Sun", {})
    moon = planets.get("Moon", {})
    mercury = planets.get("Mercury", {})
    venus = planets.get("Venus", {})
    mars = planets.get("Mars", {})
    jupiter = planets.get("Jupiter", {})
    saturn = planets.get("Saturn", {})

    hand_elem = palm_features.get("element", "fire")
    hand_elem_ru = palm_features.get("element_ru", "Рука Огня")
    mounts = palm_features.get("mounts", {})
    lines = palm_features.get("lines", {})

    convergences = []
    contradictions = []
    resonance_points = 0
    total_checks = 0

    # 0. Chronological Time Bridge (Astrology Cycles ⟷ Palm Age Milestones)
    chronology = calculate_chronology_bridge(natal_chart, palm_features)
    active_m = chronology["active_milestone"]
    resonance_points += 2.0
    total_checks += 1
    convergences.append({
        "theme": f"Хронологический Резонанс ({active_m['age_label']}): {active_m['title']}",
        "astrology": f"{active_m['astrology_phase']} (Управитель MC: {chronology['mc_ruler']}, ASC: {chronology['asc_ruler']})",
        "palmistry": f"{active_m['palm_location']} (Коэффициент реализации K_realization: {chronology['realization_score']}%)",
        "interpretation": active_m["meaning"],
        "impact": "high",
    })

    # 0.1. Knotty Joints / Philosophical Hand Check
    if palm_features.get("knotty_joints") or hand_elem == "philosophic":
        resonance_points += 2.0
        total_checks += 1
        convergences.append({
            "theme": "Философский Узел: Архитектурный разум и системный скепсис",
            "astrology": f"Ментальные маркеры карты (Меркурий в {mercury.get('sign_ru')}, влияние Сатурна в {saturn.get('house')} доме)",
            "palmistry": "Узловатые суставы пальцев (Двойной узел: философский + материальный порядок)",
            "interpretation": "Выраженные суставы на длинных пальцах при квадратной ладони — классический признак Философской руки (Д'Арпентиньи). "
                              "Это знак глубокого исследователя, архитектора сложных систем и мыслителя. "
                              "Вы не принимаете на веру авторитеты и догмы: любая информация раскладывается на первоэлементы, "
                              "проходит строгий логический аудит и затем собирается в надежную, работающую конструкцию.",
            "impact": "high",
        })

    # 1. Element Harmony Check
    total_checks += 1
    if astro_elem == hand_elem or (hand_elem == "philosophic" and astro_elem in ["air", "earth"]):
        resonance_points += 2
        convergences.append({
            "theme": "Фундаментальная стихийная гармония",
            "astrology": f"Доминирующая стихия гороскопа: {astro_elem_ru} (Солнце в знаке {sun.get('sign_ru')}, Асцендент в знаке {asc_sign})",
            "palmistry": f"{hand_elem_ru} ({palm_features.get('proportions', {}).get('palm_shape')} ладонь)",
            "interpretation": f"Полное совпадение аналитической природы и формы действия. "
                              f"Ваши врожденные астрологические склонности органично встроены в конституцию руки.",
            "impact": "high",
        })

    elif (astro_elem in ["fire", "air"] and hand_elem in ["fire", "air"]) or (astro_elem in ["earth", "water"] and hand_elem in ["earth", "water"]):
        resonance_points += 1.5
        convergences.append({
            "theme": "Родство стихий (Ян / Инь резонанс)",
            "astrology": f"Космический вектор: {astro_elem_ru}",
            "palmistry": f"Земное воплощение: {hand_elem_ru}",
            "interpretation": f"Стихии карты и руки принадлежат к одной полярности. "
                              f"Это дает высокую динамику развития: ментальные идеи или эмоциональные порывы находят адекватное практическое воплощение.",
            "impact": "medium",
        })
    elif hand_elem == "philosophic" and astro_elem == "fire":
        resonance_points += 1.8
        convergences.append({
            "theme": "Прометеев Союз: Огненное Видение & Системная Архитектура",
            "astrology": f"Огненная доминанта карты ({astro_elem_ru}: Солнце в {sun.get('sign_ru')}, Асцендент в {asc_sign})",
            "palmistry": f"{hand_elem_ru} (Узловатые суставы, квадратная ладонь)",
            "interpretation": "Редкая и продуктивная комбинация. Огненный энтузиазм и визионерский напор не рассеиваются впустую, "
                              "а проходят через жесткий фильтр сатурнианско-меркурианского аудита узловатых суставов. "
                              "Вы способны не просто зажигать идеи, но возводить для них монументальные работающие механизмы.",
            "impact": "high",
        })
    elif hand_elem == "philosophic" and astro_elem == "water":
        resonance_points += 1.8
        convergences.append({
            "theme": "Герметический Синтез: Океан Чувств через Призму Разума",
            "astrology": f"Глубокая водная доминанта карты ({astro_elem_ru}: Луна в {moon.get('sign_ru')}, Асцендент в {asc_sign})",
            "palmistry": f"{hand_elem_ru} (Узловатые суставы, длинные аналитические пальцы)",
            "interpretation": "Интуитивные озарения и психологическая чуткость воды кристаллизуются в четкие ментальные модели. "
                              "Эмоциональные переживания не вызывают хаоса — философский склад ума классифицирует их, "
                              "превращая в мудрость, эмпатическое понимание мотивов других людей и глубокие труды.",
            "impact": "high",
        })
    elif hand_elem == "mixed":
        resonance_points += 1.8
        convergences.append({
            "theme": "Смешанный тип: Полифоническая Адаптивность (Main Mixte)",
            "astrology": f"Многокомпонентный натальный баланс ({astro_elem_ru} + {astro_qual})",
            "palmistry": "Смешанная рука (Комбинация разных форм пальцев и пропорций)",
            "interpretation": "Смешанный тип руки по Д'Арпентиньи отражает высокую пластичность личности. "
                              "Вы не заперты в рамках одного узкого амплуа: способность мгновенно переключаться "
                              "между анализом, практическими действиями и интуитивным пониманием людей делает вас незаменимым интегратором.",
            "impact": "high",
        })
    else:
        resonance_points += 0.8
        contradictions.append({
            "theme": "Стихийная поляризация (Контраст карты и ладони)",
            "astrology": f"Ведущая стихия карты: {astro_elem_ru} (Асцендент: {asc_sign})",
            "palmistry": f"Строение руки: {hand_elem_ru}",
            "interpretation": f"Внутренний темперамент ({astro_elem_ru}) контрастирует с формой действия в материальном мире ({hand_elem_ru}). "
                              f"Это не слабость, а редкий источник синтеза: вы способны генерировать идеи одного типа, "
                              f"но реализовывать их совершенно иным, неожиданным для окружающих способом.",
            "recommendation": "Используйте руку как стабилизирующий якорь для тонких космических энергий гороскопа.",
            "impact": "medium",
        })

    # 2. Mercury & Head Line Check (Intellect & Strategy)
    total_checks += 1
    merc_sign = mercury.get("sign_ru", "Дева")
    merc_dignity = mercury.get("dignity")
    merc_mount = mounts.get("mercury", {})
    head_line = lines.get("head", {})

    if merc_dignity in ["domicile", "exaltation"] or merc_mount.get("score", 0) >= 80:
        resonance_points += 1.5
        convergences.append({
            "theme": "Интеллектуальный фокус и дар убеждения",
            "astrology": f"Меркурий в {merc_sign} (Достоинство: {merc_dignity or 'Сильное положение'}, Дом: {mercury.get('house')})",
            "palmistry": f"Выраженный холм Меркурия + {head_line.get('quality', 'Четкая линия Головы')}",
            "interpretation": f"Мощный ментальный аппарат. Линия ума на ладони подтверждает остроту меркурианского мышления: "
                              f"способность структурировать сложные потоки информации, быстро принимать решения в неопределенности и виртуозно владеть словом.",
            "impact": "high",
        })
    else:
        resonance_points += 1.0

    # 3. Venus & Heart Line Check (Emotional & Relational Field)
    total_checks += 1
    venus_sign = venus.get("sign_ru", "Весы")
    moon_elem = moon.get("element", "water")
    heart_line = lines.get("heart", {})
    venus_mount = mounts.get("venus", {})

    if moon_elem == "water" and heart_line.get("emotional_score", 0) >= 80:
        resonance_points += 1.5
        convergences.append({
            "theme": "Глубокая эмоциональная интуиция и теплота",
            "astrology": f"Водная Луна ({moon.get('sign_ru')}) + Венера в {venus_sign}",
            "palmistry": f"Наполненный холм Венеры и выразительная линия Сердца",
            "interpretation": f"Редкая способность чувствовать настроение людей до того, как они скажут хоть слово. "
                              f"Линия Сердца показывает искренность в отношениях и высокую культуру эмпатии.",
            "impact": "high",
        })
    elif moon_elem == "water" and venus_mount.get("score", 0) < 75:
        contradictions.append({
            "theme": "Защитный панцирь чувствительности",
            "astrology": f"Водная, восприимчивая Луна в знаке {moon.get('sign_ru')}",
            "palmistry": "Сдержанный холм Венеры при строгой геометрии сердечной линии",
            "interpretation": "Глубокий океан переживаний внутри сочетается с внешней непроницаемостью. "
                              "Вы можете казаться окружающим сдержанными, защищая свою ранимость.",
            "recommendation": "Учитесь доверять близким и находить безопасные творческие каналы для выражения чувств.",
            "impact": "high",
        })

    # 4. Saturn & Fate Line Check (Life Mission & Destiny)
    total_checks += 1
    saturn_house = saturn.get("house", 10)
    fate_line = lines.get("fate", {})
    saturn_mount = mounts.get("saturn", {})

    if fate_line.get("present") and (saturn_house in [1, 9, 10] or saturn_mount.get("score", 0) >= 75):
        resonance_points += 2
        convergences.append({
            "theme": "Осознанное призвание и вектор судьбы",
            "astrology": f"Сатурн в {saturn.get('sign_ru')} в {saturn_house}-м доме гороскопа",
            "palmistry": f"Отчетливая Линия Судьбы (Сатурна), устремленная к среднему пальцу",
            "interpretation": f"Вы человек с четким внутренним компасом. Карта и ладонь единогласно указывают "
                              f"на то, что наибольшие триумфы приходят через последовательность, верность своим ценностям и профессиональную выдержку.",
            "impact": "high",
        })
    elif saturn_house in [1, 10] and saturn_mount.get("score", 0) < 70:
        contradictions.append({
            "theme": "Кармический Диссонанс: Проработка Структуры (Сатурн)",
            "astrology": f"Сильный кардинальный Сатурн в {saturn_house}-м доме гороскопа",
            "palmistry": "Сглаженный холм Сатурна (недостаточная материальная кристаллизация вектора)",
            "interpretation": "Герметический парадокс: натальная карта возлагает на вас высокую миссию организатора и архитектора, "
                              "однако рука показывает период внутренней неопределенности или сопротивления жестким рамкам. "
                              "Это не ошибка системы, а ваш ключевой кармический урок: переход от реактивного труда к осознанному стратегическому строительству жизни.",
            "recommendation": "Внедрите четкий тайм-менеджмент, методичные привычки и долгосрочные цели — это укрепит физический холм Сатурна и проявит Линию Судьбы.",
            "impact": "high",
        })
    else:
        resonance_points += 1.0

    # 5. Sun & Apollo Mount Check (Creativity & Radiance)
    total_checks += 1
    sun_house = sun.get("house", 1)
    sun_sign = sun.get("sign_ru", "Лев")
    apollo_mount = mounts.get("apollo", {})
    sun_line = lines.get("sun", {})

    if sun.get("sign") in ["Leo", "Aries", "Sagittarius"] or apollo_mount.get("score", 0) >= 80:
        resonance_points += 1.5
        convergences.append({
            "theme": "Творческая харизма и солнечный магнетизм",
            "astrology": f"Солнце в знаке {sun_sign} ({sun_house}-й дом)",
            "palmistry": f"Холм Аполлона высокой выраженности ({apollo_mount.get('development_ru')})",
            "interpretation": f"Природная способность вдохновлять людей. Ваша энергетика заметна в любом коллективе: "
                              f"рука несет отпечаток созидательной щедрости и стремления оставлять яркий след.",
            "impact": "high",
        })
    elif sun_house in [1, 5, 10] and apollo_mount.get("score", 0) < 70:
        contradictions.append({
            "theme": "Кармический Диссонанс: Скрытый Солнечный Свет",
            "astrology": f"Яркое проявленное Солнце в {sun_house}-м доме в знаке {sun_sign}",
            "palmistry": "Скромный холм Аполлона при сдержанной Линии Солнца",
            "interpretation": "Внутри вас горит мощный творческий и лидерский огонь, но на физическом плане ладонь фиксирует "
                              "страх публичной оценки или привычку держаться в тени. Потенциал признания велик, но ждет смелости заявить о себе.",
            "recommendation": "Выходите на сцену, делитесь плодами своего творчества открыто и не обесценивайте собственную уникальность.",
            "impact": "medium",
        })
    else:
        resonance_points += 1.0

    # 6. Nail Shape (Onychognomy Check)
    nail_data = palm_features.get("nail_shape")
    if nail_data:
        convergences.append({
            "theme": f"Онихогномия: {nail_data.get('name_ru')}",
            "astrology": f"Ментально-волевой регистр (Меркурий в {mercury.get('sign_ru')}, Марс в {mars.get('sign_ru')})",
            "palmistry": f"{nail_data.get('name_ru')} (Стихия: {nail_data.get('element')})",
            "interpretation": f"Форма ногтей отражает биологический темп реакций и стиль мышления: {nail_data.get('quality')}",
            "impact": "medium",
        })

    # 7. William G. Benham Archetype & Planetary Resonance
    benham_archetype = palm_features.get("benham_archetype")
    if not benham_archetype and palm_features.get("mounts"):
        benham_archetype = classify_benham_archetype(palm_features.get("mounts", {}))

    if benham_archetype:
        total_checks += 1
        primary_planet = benham_archetype.get("primary_planet", "")
        # Check matching planet in natal chart
        matching_planet = planets.get(primary_planet, {})
        primary_mount_name = benham_archetype.get("primary_name", "")
        
        if matching_planet:
            planet_house = matching_planet.get("house", 1)
            planet_sign = matching_planet.get("sign_ru", "")
            resonance_points += 2.0
            convergences.append({
                "theme": f"Архетипический Резонанс по У. Бенхаму: {benham_archetype.get('composite_title')}",
                "astrology": f"Планетарный патрон: {primary_planet} в знаке {planet_sign} ({planet_house}-й дом)",
                "palmistry": f"{primary_mount_name} ({benham_archetype.get('primary_score')} баллов) — {benham_archetype.get('primary_title')}",
                "interpretation": f"{benham_archetype.get('synthesis_note')} "
                                  f"В натальной карте {primary_planet} расположен в {planet_sign}, что наполняет этот хирологический архетип "
                                  f"конкретным астрологическим стилем реализации и подтверждает высокое призвание в сферах: "
                                  f"{', '.join(benham_archetype.get('recommended_careers', []))}.",
                "impact": "high",
            })
        else:
            resonance_points += 1.5

    # 8. Sternberg & Desbarrolles Three Worlds & Thumb Formula
    three_worlds = palm_features.get("three_worlds")
    if not three_worlds:
        three_worlds = analyze_three_worlds_and_thumb(palm_features)

    if three_worlds:
        tw = three_worlds.get("three_worlds", {})
        tf = three_worlds.get("thumb_formula", {})
        convergences.append({
            "theme": f"Баланс Трех Миров Фаланг и Воли Большого Пальца (Штернберг & Дебаролль)",
            "astrology": f"Ментально-практический контур карты (Меркурий {merc_sign}, Сатурн в {saturn.get('sign_ru')}, Марс в {mars.get('sign_ru')})",
            "palmistry": f"{tw.get('dominant_world')} | Формула пальца: {tf.get('balance_title')} (Воля: {tf.get('will_score')}%, Логика: {tf.get('logic_score')}%)",
            "interpretation": f"{tw.get('interpretation')} По королевской формуле большого пальца: {tf.get('interpretation')}",
            "impact": "high",
        })

    # 9. Head & Life Line Origin Separation Check (Independence of Mind)
    detected_lines = palm_features.get("detected_lines", {})
    if detected_lines.get("head_life_separated"):
        gap_ratio = detected_lines.get("gap_ratio", 0.065)
        gap_percent = detected_lines.get("gap_percent", round(gap_ratio * 100, 1))
        gap_px = detected_lines.get("gap_distance_px", 20.0)
        total_checks += 1
        resonance_points += 2.0
        convergences.append({
            "theme": "Врожденная Независимость: Раздельный исток Линий Головы и Жизни",
            "astrology": f"Сигнатура суверенности (Уран/Марс, Асцендент в {asc_sign})",
            "palmistry": f"Раздельные истоки линий (биометрический интервал: {gap_percent}% от высоты ладони)",
            "interpretation": (
                f"Линия Головы и Линия Жизни начинаются раздельно с биометрическим зазором {gap_percent}% от высоты ладони "
                f"(эквивалент ~{gap_px}px при эталонном масштабе). "
                f"Это фундаментальный классический маркер независимого ума и ранней самостоятельности по Бенхаму. "
                f"Вы не поддаетесь конформизму и стадному мышлению, критически перепроверяете авторитеты "
                f"и обладаете смелостью прокладывать собственный маршрут, опираясь на внутренний компас."
            ),
            "impact": "high",
        })

    # Resonance Score (0 to 100%)
    max_possible = total_checks * 2.0
    resonance_percent = min(98, max(62, int((resonance_points / max_possible) * 100)))

    # Archetype Title
    if hand_elem == "philosophic":
        if astro_elem == "air":
            archetype_title = "Великий Архитектор: Чистый Ментальный Синтез"
        elif astro_elem == "earth":
            archetype_title = "Системный Мастер: Практическая Мудрость"
        elif astro_elem == "fire":
            archetype_title = "Прометеев Разум: Огненный Визионер & Архитектор"
        elif astro_elem == "water":
            archetype_title = "Герметический Мудрец: Интуиция & Строгий Анализ"
        else:
            archetype_title = f"Философский Разум: Архитектура Знания ({astro_elem_ru})"
    elif hand_elem == "mixed":
        archetype_title = f"Универсальный Синтезатор: Полифонический Разум ({astro_elem_ru})"
    elif astro_elem == hand_elem:
        archetype_title = f"Гармоничный Проводник Стихии {astro_elem_ru.capitalize()}"
    elif (astro_elem in ["fire", "air"] and hand_elem in ["fire", "air"]):
        archetype_title = "Активный Творец: Импульс & Воплощение"
    else:
        archetype_title = f"Мастер Трансформации: {astro_elem_ru} ⟷ {hand_elem_ru}"

    summary = (
        f"Синтез натальной карты ({sun.get('sign_ru')}, Асцендент {asc_sign}) "
        f"и параметров ладони ({hand_elem_ru}) выявил резонанс на уровне {resonance_percent}%. "
        f"Основной двигатель личности — сочетание {astro_elem_ru.lower()} астрологического темперамента "
        f"с материальной надежностью {hand_elem_ru.lower()}. "
        f"Звезды формируют стратегические возможности и временные циклы, "
        f"а рельеф ладони свидетельствует о том, как эти энергии уже интегрированы в характер и привычки."
    )

    practical_advice = [
        f"Опирайтесь на силу своего Меркурия ({merc_sign}) и четкую линию Головы в моменты важных переговоров и контрактов.",
        f"В периоды транзитных напряжений используйте стабилизирующие свойства {hand_elem_ru.lower()} для заземления эмоций.",
        f"Линия Судьбы активна: не бойтесь брать на себя лидерство в долгосрочных проектах — ваша выносливость выше средней.",
        "Для раскрытия скрытого потенциала регулярно синхронизируйте свои ментальные планы с ощущениями физического тела."
    ]
    if hand_elem == "philosophic" or palm_features.get("knotty_joints"):
        practical_advice.insert(0, "Ваш двойной философский узел дает редкий дар системного видения: доверяйте своей потребности подвергать вещи сомнению и выстраивать надежные, проверенные решения.")

    return {
        "title": f"Синтетический анализ: {natal_chart.get('name', 'Личность')}",
        "archetype": archetype_title,
        "resonance_percent": resonance_percent,
        "summary": summary,
        "astro_summary": {
            "sun": f"{sun.get('sign_ru')} в {sun.get('house')} доме",
            "moon": f"{moon.get('sign_ru')} в {moon.get('house')} доме",
            "ascendant": f"{asc_sign} ({asc.get('degree_formatted')})",
            "dominant_element": astro_elem_ru,
            "dominant_quality": astro_qual,
        },
        "palm_summary": {
            "element": hand_elem_ru,
            "proportions": f"{palm_features.get('proportions', {}).get('palm_shape', 'Гармоничная')} ладонь, {str(palm_features.get('proportions', {}).get('fingers_length') or 'пропорциональные').lower()} пальцы",
            "dominant_mount": "Меркурий / Юпитер" if hand_elem in ["air", "fire"] else "Венера / Луна",
            "dominant_line": "Линия Головы и Линия Судьбы",
        },
        "convergences": convergences,
        "contradictions": contradictions,
        "chronology": chronology,
        "benham_archetype": benham_archetype,
        "three_worlds": three_worlds,
        "practical_advice": practical_advice,
        "disclaimer": "Синтез натальной карты и хиромантии носит символический, философско-исследовательский и мотивационный характер.",
    }
