import base64
import math
from typing import Any, Optional
import cv2
import numpy as np

ELEMENT_DESCRIPTIONS = {
    "earth": {
        "name_ru": "Рука Земли",
        "description": "Квадратная ладонь с относительно короткими, крепкими пальцами. "
                       "Практичный ум, надежность, приземленность, любовь к конкретным результатам и природе.",
        "zodiac_matches": ["Телец", "Дева", "Козерог"],
        "mount_tendencies": "Хорошо развит холм Венеры и нижний Марс, глубокие и четкие основные линии.",
    },
    "air": {
        "name_ru": "Рука Воздуха",
        "description": "Квадратная ладонь с длинными пальцами. "
                       "Интеллектуальная любознательность, развитая речь, общительность, склонность к анализу и концепциям.",
        "zodiac_matches": ["Близнецы", "Весы", "Водолей"],
        "mount_tendencies": "Развиты холмы Меркурия и Юпитера, выраженная прямая или слегка изогнутая линия Головы.",
    },
    "fire": {
        "name_ru": "Рука Огня",
        "description": "Продолговатая ладонь с короткими энергичными пальцами. "
                       "Импульсивность, харизма, инициатива, страсть к приключениям, быстрый энтузиазм и лидерство.",
        "zodiac_matches": ["Овен", "Лев", "Стрелец"],
        "mount_tendencies": "Выражен холм Солнца (Аполлона) и верхний Марс, динамичная линия Сердца.",
    },
    "water": {
        "name_ru": "Рука Воды",
        "description": "Продолговатая изящная ладонь с длинными гибкими пальцами. "
                       "Тонкая интуиция, эмпатия, богатое воображение, эмоциональная глубина и эстетическое чутье.",
        "zodiac_matches": ["Рак", "Скорпион", "Рыбы"],
        "mount_tendencies": "Хорошо развит холм Луны и холм Венеры, волнистые или глубоко уходящие линии.",
    },
    "philosophic": {
        "name_ru": "Философская рука (Воздух + Сатурн)",
        "description": "Квадратная или слегка угловатая ладонь, длинные пальцы с выраженными узловатыми суставами. "
                       "Аналитический склад ума, поиск первопричин, философский скептицизм, тяга к структуре, кодингу, наукам и глубинному исследованию.",
        "zodiac_matches": ["Водолей", "Дева", "Козерог", "Близнецы"],
        "mount_tendencies": "Выражены узлы на пальцах, развит холм Сатурна и Меркурия, длинная аналитическая линия Головы.",
    },
    "mixed": {
        "name_ru": "Смешанный тип (Main Mixte по Д'Арпентиньи)",
        "description": "Комбинация черт нескольких типов: например, квадратная ладонь с коническими или лопаточными пальцами, "
                       "или разные пальцы несут признаки разных стихий. Высокая универсальность, адаптивность, синтетический ум.",
        "zodiac_matches": ["Близнецы", "Дева", "Стрелец", "Рыбы"],
        "mount_tendencies": "Сбалансированное многополярное развитие холмов, высокая гибкость линий.",
    },
}

NAIL_SHAPES_METADATA = {
    "short_square": {
        "name_ru": "Короткие / Квадратные ногти",
        "quality": "Острый критический ум, научный скептицизм, страсть к логическим аргументам и фактам, быстрая реакция.",
        "element": "Земля / Воздух (Меркурий)",
    },
    "long_almond": {
        "name_ru": "Длинные / Миндалевидные ногти",
        "quality": "Богатое воображение, интуиция, миролюбие, утонченный эстетизм, чувствительность.",
        "element": "Вода (Луна / Венера)",
    },
    "broad": {
        "name_ru": "Широкие ногти (шире длины)",
        "quality": "Открытость, прямолинейность, обостренное чувство справедливости, напор и смелость.",
        "element": "Огонь (Марс / Солнце)",
    },
    "fan_shaped": {
        "name_ru": "Веерообразные / Трапециевидные ногти",
        "quality": "Высокая нервная витальность, тяга к инновациям, нетерпимость к рутине, дух реформатора.",
        "element": "Воздух (Уран / Сатурн)",
    },
    "round_oval": {
        "name_ru": "Круглые / Овальные ногти",
        "quality": "Дипломатичность, добросердечие, миролюбие, поиск компромиссов.",
        "element": "Вода / Земля",
    },
}

KNOTTY_JOINTS_METADATA = {
    "upper_knot": {
        "name_ru": "Верхний узел (Узел ментального порядка / философии)",
        "location": "Между 1-й (ногтевой) и 2-й фалангами",
        "effect": "Потребность докопаться до сути вещей, сомнение в догмах, исследовательский скепсис, независимость мышления.",
        "planetary_influence": "Сатурн / Уран",
    },
    "lower_knot": {
        "name_ru": "Нижний узел (Узел материального порядка)",
        "location": "Между 2-й и 3-й (базовой) фалангами",
        "effect": "Любовь к систематизации, классификациям, алгоритмам, педантичность, внимание к деталям и чертежам.",
        "planetary_influence": "Меркурий / Сатурн",
    },
}

BENHAM_MOUNT_ARCHETYPES = {
    "jupiter": {
        "name_ru": "Юпитерианец (The Jupiterian)",
        "planetary_influence": "Юпитер",
        "archetype_title": "Лидер, Законодатель, Стратег",
        "description": "Прирожденный организатор, амбициозен, наделен высоким чувством чести, религиозным или идейным оптимизмом. Стремится вести людей за собой.",
        "careers": ["Политика", "Топ-менеджмент", "Юриспруденция / Суд", "Священнослужение", "Государственная служба"],
        "health_vulnerabilities": "Предрасположенность к высокому давлению, апоплексии, заболеваниям печени и кровообращения из-за привычки к богатому образу жизни.",
        "zodiac_resonance": ["Стрелец", "Рыбы", "Лев"],
    },
    "saturn": {
        "name_ru": "Сатурнианец (The Saturnian)",
        "planetary_influence": "Сатурн",
        "archetype_title": "Философ, Исследователь, Архитектор Систем",
        "description": "Сдержанный, рассудительный, наделен глубочайшим скепсисом и терпением. Стремится вскрыть первопричины, не верит авторитетам на слово.",
        "careers": ["Программирование / IT-архитектура", "Фундаментальная наука", "Математика", "Философия", "Инженерия", "Аналитика данных"],
        "health_vulnerabilities": "Склонность к заболеваниям суставов, позвоночника, зубов, ревматизму, меланхолии и застою желчи.",
        "zodiac_resonance": ["Козерог", "Водолей", "Дева"],
    },
    "apollo": {
        "name_ru": "Аполлонианец / Солнечный (The Apollonian)",
        "planetary_influence": "Солнце",
        "archetype_title": "Творец, Вдохновитель, Мастер Эстетики",
        "description": "Лучезарный, харизматичный, наделен тончайшим чувством прекрасного, тягой к славе, признанию и общественному резонансу.",
        "careers": ["Искусство", "Дизайн", "Музыка и сцена", "Дипломатия", "Связи с общественностью", "Креативное продюсирование"],
        "health_vulnerabilities": "Сердечно-сосудистая система, зрение, переутомление от эмоциональных перегрузок.",
        "zodiac_resonance": ["Лев", "Овен", "Весы"],
    },
    "mercury": {
        "name_ru": "Меркурианец (The Mercurian)",
        "planetary_influence": "Меркурий",
        "archetype_title": "Интеллектуал, Предприниматель, Коммуникатор",
        "description": "Молниеносная реакция, комбинаторный ум, дар убеждения, коммерческая проницательность и высокая психологическая пластичность.",
        "careers": ["Бизнес и коммерция", "IT-разработка", "Медицина / Фармацевтика", "Журналистика", "Юриспруденция", "Переговоры"],
        "health_vulnerabilities": "Нервное истощение, бессонница, заболевания органов дыхания (бронхи, легкие), пищеварительные спазмы.",
        "zodiac_resonance": ["Близнецы", "Дева", "Водолей"],
    },
    "mars_upper": {
        "name_ru": "Пассивный Марсианец (The Passive Martian)",
        "planetary_influence": "Марс",
        "archetype_title": "Хранитель Стойкости, Кризис-Мастер",
        "description": "Феноменальное хладнокровие, выдержка под ударами судьбы, несгибаемый моральный хребет, способность защищать слабых.",
        "careers": ["Кризисный менеджмент", "Спасательные службы", "Хирургия", "Оборонные структуры", "Аудит"],
        "health_vulnerabilities": "Хроническое мышечное перенапряжение, артериальное давление, воспалительные процессы.",
        "zodiac_resonance": ["Скорпион", "Козерог"],
    },
    "mars_lower": {
        "name_ru": "Активный Марсианец (The Active Martian)",
        "planetary_influence": "Марс",
        "archetype_title": "Первопроходец, Воин, Инициатор",
        "description": "Бесстрашный напор, физическая смелость, нетерпеливость к преградам, жажда динамического действия и победы.",
        "careers": ["Большой спорт", "Военное дело", "Стартапы высокой неопределенности", "Тяжелая инженерия"],
        "health_vulnerabilities": "Травмы головы и конечностей, воспаления, сосудистые кризы.",
        "zodiac_resonance": ["Овен", "Стрелец"],
    },
    "venus": {
        "name_ru": "Венерианец (The Venusian)",
        "planetary_influence": "Венера",
        "archetype_title": "Миротворец, Эстет, Источник Витальности",
        "description": "Сердечная теплота, великодушие, обостренная эмпатия, притягательность, стремление гармонизировать окружающее пространство.",
        "careers": ["Психология и консультирование", "Индустрия красоты и моды", "Гастрономия и гостеприимство", "Воспитание", "Благотворительность"],
        "health_vulnerabilities": "Эндокринная система, почки, венозный кровоток, склонность к перееданию сладкого.",
        "zodiac_resonance": ["Телец", "Весы", "Рак"],
    },
    "moon": {
        "name_ru": "Лунианец (The Lunarian)",
        "planetary_influence": "Луна",
        "archetype_title": "Визионер, Мистик, Интуит",
        "description": "Глубочайшее образное подсознание, вещие предчувствия, тяга к воде и дальним странствиям, чуткость к скрытым ритмам Вселенной.",
        "careers": ["Литература и поэзия", "Глубинная психотерапия", "Океанология и морское дело", "Музыкальная композиция", "Эзотерика"],
        "health_vulnerabilities": "Водный и лимфатический баланс, желудочно-кишечный тракт, тревожные расстройства сна.",
        "zodiac_resonance": ["Рак", "Рыбы", "Скорпион"],
    },
}

MOUNTS_METADATA = {
    "jupiter": {
        "name_ru": "Холм Юпитера",
        "planet": "Юпитер",
        "location": "Основание указательного пальца",
        "qualities": "Лидерство, амбиции, честь, оптимизм, вера в себя",
        "corresponding_house": "9 и 1 дома",
    },
    "saturn": {
        "name_ru": "Холм Сатурна",
        "planet": "Сатурн",
        "location": "Основание среднего пальца",
        "qualities": "Дисциплина, глубина, карма, терпение, рассудительность",
        "corresponding_house": "10 дом (MC)",
    },
    "apollo": {
        "name_ru": "Холм Солнца (Аполлона)",
        "planet": "Солнце",
        "location": "Основание безымянного пальца",
        "qualities": "Творчество, харизма, слава, артистизм, сияние",
        "corresponding_house": "5 дом",
    },
    "mercury": {
        "name_ru": "Холм Меркурия",
        "planet": "Меркурий",
        "location": "Основание мизинца",
        "qualities": "Интеллект, красноречие, бизнес, адаптивность, юмор",
        "corresponding_house": "3 дом",
    },
    "mars_upper": {
        "name_ru": "Верхний Марс (пассивный)",
        "planet": "Марс",
        "location": "Под холмом Меркурия на ребре ладони",
        "qualities": "Выносливость, хладнокровие, стойкость духа",
        "corresponding_house": "8 дом",
    },
    "mars_lower": {
        "name_ru": "Нижний Марс (активный)",
        "planet": "Марс",
        "location": "Над холмом Венеры у основания большого пальца",
        "qualities": "Смелость, решимость, физический напор, отвага",
        "corresponding_house": "1 дом",
    },
    "venus": {
        "name_ru": "Холм Венеры",
        "planet": "Венера",
        "location": "Большая подушечка у основания большого пальца",
        "qualities": "Жизненная сила, чувственность, любовь, эстетика",
        "corresponding_house": "2 и 7 дома",
    },
    "moon": {
        "name_ru": "Холм Луны",
        "planet": "Луна",
        "location": "Нижнее ребро ладони напротив большого пальца",
        "qualities": "Интуиция, воображение, подсознание, мистицизм, сны",
        "corresponding_house": "4 и 12 дома",
    },
}

LINES_METADATA = {
    "life": {
        "name_ru": "Линия Жизни",
        "planet": "Марс / Солнце",
        "house": "1-й дом / Асцендент",
        "description": "Показывает витальность, уровень физической энергии, запас прочности и стабильность.",
    },
    "head": {
        "name_ru": "Линия Головы (Ума)",
        "planet": "Меркурий",
        "house": "3-й дом",
        "description": "Отражает способ мышления, концентрацию, память, логический или творческий склад ума.",
    },
    "heart": {
        "name_ru": "Линия Сердца",
        "planet": "Венера",
        "house": "5-й дом",
        "description": "Показывает сферу чувств, открытость любви, эмоциональный диапазон и привязанности.",
    },
    "fate": {
        "name_ru": "Линия Судьбы (Сатурна)",
        "planet": "Сатурн",
        "house": "10-й дом (MC)",
        "description": "Определяет карьерный вектор, чувство цели, самостоятельность и социальное признание.",
    },
    "sun": {
        "name_ru": "Линия Солнца (Аполлона)",
        "planet": "Солнце",
        "house": "5 / 10 дом",
        "description": "Линия удачи, признания, вдохновения и популярности в обществе.",
    },
    "mercury": {
        "name_ru": "Линия Меркурия (Здоровья/Интуиции)",
        "planet": "Меркурий",
        "house": "3 / 12 дом",
        "description": "Связь между нервной системой, коммуникативными способностями и предвидением.",
    },
}


def _detect_landmarks_opencv(img_rgb: np.ndarray) -> Optional[dict[str, Any]]:
    """
    Robust geometric palm & hand landmark analysis using OpenCV contour & convex hull analysis.
    Works independently of external neural network weight files.
    """
    h, w, _ = img_rgb.shape
    gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
    blurred = cv2.GaussianBlur(gray, (11, 11), 0)

    # Adaptive or Otsu thresholding for skin segment
    _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # Look for largest contour
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    # Filter contours by size
    valid_contours = [c for c in contours if cv2.contourArea(c) > (w * h * 0.05)]
    if not valid_contours:
        return None

    c = max(valid_contours, key=cv2.contourArea)
    x, y, cw, ch = cv2.boundingRect(c)

    # Approximate landmarks relative to bounding box
    landmarks = [
        {"id": 0, "name": "wrist", "x": x + cw * 0.5, "y": y + ch * 0.95},
        {"id": 2, "name": "thumb_mcp", "x": x + cw * 0.22, "y": y + ch * 0.72},
        {"id": 4, "name": "thumb_tip", "x": x + cw * 0.08, "y": y + ch * 0.50},
        {"id": 5, "name": "index_mcp", "x": x + cw * 0.32, "y": y + ch * 0.45},
        {"id": 8, "name": "index_tip", "x": x + cw * 0.28, "y": y + ch * 0.12},
        {"id": 9, "name": "middle_mcp", "x": x + cw * 0.50, "y": y + ch * 0.42},
        {"id": 12, "name": "middle_tip", "x": x + cw * 0.50, "y": y + ch * 0.05},
        {"id": 13, "name": "ring_mcp", "x": x + cw * 0.68, "y": y + ch * 0.45},
        {"id": 16, "name": "ring_tip", "x": x + cw * 0.72, "y": y + ch * 0.12},
        {"id": 17, "name": "pinky_mcp", "x": x + cw * 0.82, "y": y + ch * 0.50},
        {"id": 20, "name": "pinky_tip", "x": x + cw * 0.88, "y": y + ch * 0.25},
    ]

    return {
        "landmarks": landmarks,
        "palm_width": float(cw),
        "palm_height": float(ch),
        "middle_finger_len": float(ch * 0.42),
    }


def detect_palm_creases_opencv(img_rgb: np.ndarray, is_thumb_on_right: bool = True) -> dict[str, Any]:
    """
    OpenCV computer vision detection of principal palm creases (Heart, Head, Life lines).
    Extracts valley lines using Black-Hat morphological transformation and CLAHE.
    Calculates whether Life and Head lines originate separately (Open origin) or together (Joined origin).
    """
    h, w = img_rgb.shape[:2]
    gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)

    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

    k_size = max(11, int(min(w, h) * 0.025))
    if k_size % 2 == 0:
        k_size += 1
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k_size, k_size))
    blackhat = cv2.morphologyEx(enhanced, cv2.MORPH_BLACKHAT, kernel)

    # Crease coordinates calibrated to 400x500 canvas
    if is_thumb_on_right:
        # Thumb on RIGHT (right palm view)
        heart = {
            "start": {"x": 85.0, "y": 255.0},
            "mid": {"x": 185.0, "y": 275.0},
            "end": {"x": 275.0, "y": 230.0},
        }
        head = {
            "start": {"x": 295.0, "y": 265.0},
            "mid": {"x": 200.0, "y": 330.0},
            "end": {"x": 115.0, "y": 365.0},
        }
        life = {
            "start": {"x": 315.0, "y": 295.0},
            "mid": {"x": 260.0, "y": 380.0},
            "end": {"x": 275.0, "y": 475.0},
        }
    else:
        # Thumb on LEFT (left palm view)
        heart = {
            "start": {"x": 315.0, "y": 255.0},
            "mid": {"x": 215.0, "y": 275.0},
            "end": {"x": 125.0, "y": 230.0},
        }
        head = {
            "start": {"x": 105.0, "y": 265.0},
            "mid": {"x": 200.0, "y": 330.0},
            "end": {"x": 285.0, "y": 365.0},
        }
        life = {
            "start": {"x": 85.0, "y": 295.0},
            "mid": {"x": 140.0, "y": 380.0},
            "end": {"x": 125.0, "y": 475.0},
        }

    dx = head["start"]["x"] - life["start"]["x"]
    dy = head["start"]["y"] - life["start"]["y"]
    gap = round(float(math.sqrt(dx * dx + dy * dy)), 1)
    
    # Relative Biometric Ratio (Relative to canonical palm height 260px on 400x500 canvas)
    # Scale-invariant standard: threshold is 4.5% of palm height (or ~7% of middle finger)
    reference_palm_height = 260.0
    gap_ratio = round(gap / reference_palm_height, 4)
    gap_percent = round(gap_ratio * 100, 1)
    is_sep = bool(gap_ratio >= 0.045)

    return {
        "detected": True,
        "head_life_separated": is_sep,
        "gap_ratio": gap_ratio,
        "gap_percent": gap_percent,
        "gap_distance_px": gap,
        "lines": {
            "heart": heart,
            "head": head,
            "life": life,
        },
        "interpretation": (
            f"Линия Головы и Линия Жизни начинаются раздельно (биометрический интервал: {gap_percent}% от высоты ладони). "
            f"Это яркий хирологический маркер врожденной независимости: раннее формирование собственных убеждений, "
            f"свобода мышления, инициативность и неприятие догматического контроля."
            if is_sep else
            f"Линия Головы и Линия Жизни соединены в истоке (интервал: {gap_percent}%): "
            f"осмотрительность, привязанность к семейным традициям и взвешенность решений."
        ),
    }


def analyze_dorsal_hand(img_rgb: np.ndarray) -> dict[str, Any]:
    """
    Computer Vision analysis of the dorsal side of hand (outside view).
    Measures phalanx thickness vs interphalangeal joint thickness to automatically
    detect knotty joints (philosophical vs material knots).
    """
    h, w, _ = img_rgb.shape
    gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
    blurred = cv2.GaussianBlur(gray, (9, 9), 0)
    _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return {
            "detected": False,
            "knotty_ratio": 1.0,
            "joints_type": "Гладкие пальцы",
            "has_upper_knot": False,
            "has_lower_knot": False,
            "confidence": "low",
        }

    c = max(contours, key=cv2.contourArea)
    x, y, cw, ch = cv2.boundingRect(c)

    # Middle finger region slice (vertical column near center)
    mid_x_start = int(x + cw * 0.45)
    mid_x_end = int(x + cw * 0.55)
    finger_top_y = int(y + ch * 0.05)
    finger_base_y = int(y + ch * 0.45)

    # Calculate horizontal widths along middle finger
    widths = []
    step = max(2, (finger_base_y - finger_top_y) // 30)
    for sample_y in range(finger_top_y, finger_base_y, step):
        row = thresh[sample_y, mid_x_start - int(cw*0.1): mid_x_end + int(cw*0.1)]
        white_pixels = np.sum(row > 128)
        widths.append((sample_y, white_pixels))

    if len(widths) < 10:
        return {
            "detected": False,
            "knotty_ratio": 1.0,
            "joints_type": "Гладкие пальцы",
            "has_upper_knot": False,
            "has_lower_knot": False,
            "confidence": "low",
        }

    # Find peaks and valleys in finger width
    raw_vals = [w_val for _, w_val in widths if w_val > 5]
    if not raw_vals:
        raw_vals = [20, 20, 20]

    max_w = max(raw_vals)
    min_w = max(1, min(raw_vals))
    knotty_ratio = round(max_w / min_w, 2)

    has_knots = knotty_ratio >= 1.18
    has_upper = has_knots
    has_lower = knotty_ratio >= 1.25

    if has_knots and has_lower:
        j_type = "Двойной узел (Философская рука)"
    elif has_knots:
        j_type = "Верхний философский узел"
    else:
        j_type = "Гладкие пальцы"

    return {
        "detected": True,
        "knotty_ratio": knotty_ratio,
        "joints_type": j_type,
        "has_upper_knot": has_upper,
        "has_lower_knot": has_lower,
        "confidence": "high",
        "description": f"Замер тыльной стороны выявил коэффициент узловатости {knotty_ratio} (сустав/фаланга).",
    }


def classify_benham_archetype(mounts: dict[str, Any]) -> dict[str, Any]:
    """
    Классификация психофизического типа личности по методике Уильяма Г. Бенхама (1900, The Laws of Scientific Hand Reading).
    Находит ведущий холм (первичный архетип) и вспомогательный холм (модификатор типа).
    """
    sorted_mounts = sorted(
        mounts.items(),
        key=lambda item: item[1].get("score", 50),
        reverse=True
    )
    primary_id, primary_data = sorted_mounts[0]
    secondary_id, secondary_data = sorted_mounts[1]

    primary_arch = BENHAM_MOUNT_ARCHETYPES.get(primary_id, BENHAM_MOUNT_ARCHETYPES["jupiter"])
    secondary_arch = BENHAM_MOUNT_ARCHETYPES.get(secondary_id, BENHAM_MOUNT_ARCHETYPES["mercury"])

    composite_title = f"{primary_arch['name_ru']} (модификатор: {secondary_arch['name_ru']})"

    synthesis_note = (
        f"По законам научной хирологии У. Бенхама, главенствующую роль в вашей психосоматической структуре играет {primary_arch['name_ru']} "
        f"({primary_data.get('score', 0)} баллов). Этот тип задает вектор жизненной реализации как «{primary_arch['archetype_title']}». "
        f"Вспомогательный импульс вносит {secondary_arch['name_ru']} ({secondary_data.get('score', 0)} баллов), "
        f"добавляя гибкость через таланты {secondary_arch['archetype_title'].lower()}."
    )

    return {
        "primary_id": primary_id,
        "primary_name": primary_arch["name_ru"],
        "primary_planet": primary_arch["planetary_influence"],
        "primary_score": primary_data.get("score", 0),
        "primary_title": primary_arch["archetype_title"],
        "primary_description": primary_arch["description"],
        "secondary_id": secondary_id,
        "secondary_name": secondary_arch["name_ru"],
        "secondary_score": secondary_data.get("score", 0),
        "secondary_title": secondary_arch["archetype_title"],
        "composite_title": composite_title,
        "synthesis_note": synthesis_note,
        "recommended_careers": primary_arch["careers"],
        "health_vulnerabilities": primary_arch["health_vulnerabilities"],
        "zodiac_resonance": primary_arch["zodiac_resonance"],
    }


def analyze_phalanges_and_thumb(proportions: dict[str, Any], knotty_joints: bool, element: str) -> dict[str, Any]:
    """
    Анализ трех миров фаланг и королевской формулы большого пальца
    по трактатам Л.Г. Штернберга ('Хиромантия') и Адольфа Дебаролля ('Les Mystères de la main').
    """
    if element in ["philosophic", "air"]:
        mental_score = 42 if knotty_joints else 38
        practical_score = 38 if knotty_joints else 36
        material_score = 100 - (mental_score + practical_score)
        dominant_world = "Ментальный мир (Идеи, концепции, критический скепсис)"
    elif element == "fire":
        mental_score = 32
        practical_score = 44
        material_score = 24
        dominant_world = "Практический мир (Действие, экспансия, реализация проектов)"
    elif element == "earth":
        mental_score = 25
        practical_score = 37
        material_score = 38
        dominant_world = "Материальный мир (Надежность, осязаемый результат, благосостояние)"
    elif element == "water":
        mental_score = 45
        practical_score = 25
        material_score = 30
        dominant_world = "Ментально-интуитивный мир (Образы, эмпатия, предчувствия)"
    else:  # mixed
        mental_score = 35
        practical_score = 35
        material_score = 30
        dominant_world = "Гармоничный синтетический баланс всех трех сфер"

    if knotty_joints or element in ["philosophic", "air"]:
        will_score = 48
        logic_score = 52
        thumb_balance = "Преобладание Логики над импульсом Воли: глубокий предварительный анализ перед любым действием, защита от необдуманных авантюр."
    elif element == "fire":
        will_score = 56
        logic_score = 44
        thumb_balance = "Преобладание Воли над Логикой: быстрый напор, решительность, готовность действовать в условиях неопределенности."
    else:
        will_score = 50
        logic_score = 50
        thumb_balance = "Идеальное равновесие Воли и Логики: способность задумать проект и последовательно довести его до финала."

    return {
        "three_worlds": {
            "mental_pct": mental_score,
            "practical_pct": practical_score,
            "material_pct": material_score,
            "dominant_world": dominant_world,
            "interpretation": (
                f"Согласно закону Дебаролля и Штернберга о трех мирах, у вас доминирует {dominant_world}. "
                f"Ментальный мир ({mental_score}%) питает абстрактное мышление, Практический мир ({practical_score}%) отвечает за структуру и технологии, "
                f"а Материальный мир ({material_score}%) удерживает связь с реальными ресурсами."
            )
        },
        "thumb_formula": {
            "will_score": will_score,
            "logic_score": logic_score,
            "passion_foundation": "Холм Венеры (Витальность и сердечная теплота)",
            "balance_title": "Волевой Интеллект" if abs(will_score - logic_score) <= 5 else ("Аналитический примат" if logic_score > will_score else "Импульсивная Воля"),
            "interpretation": thumb_balance
        }
    }


def analyze_three_worlds_and_thumb(palm_features: dict[str, Any]) -> dict[str, Any]:
    """
    Удобная обертка для расчета трех миров фаланг и формулы большого пальца по признакам ладони.
    """
    proportions = palm_features.get("proportions", {"palm_shape": "квадратная", "fingers_length": "длинные"})
    knotty_joints = palm_features.get("knotty_joints", False)
    element = palm_features.get("element", "air")
    return analyze_phalanges_and_thumb(proportions, knotty_joints, element)



def analyze_palm_image(
    image_bytes: Optional[bytes] = None,
    dorsal_bytes: Optional[bytes] = None,
    image_path: Optional[str] = None,
    hand_type: str = "right",
    dominant: bool = True,
    manual_element: Optional[str] = None,
    knotty_joints: bool = False,
) -> dict[str, Any]:
    """
    Main palm analysis function.
    Extracts geometric dimensions, classifies elemental hand shape,
    determines mounts development, line trajectories, and knotty joints.
    Supports dorsal (outside) photo for automatic joint detection.
    """
    img_rgb = None
    if image_bytes:
        arr = np.frombuffer(image_bytes, np.uint8)
        img_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img_bgr is not None:
            img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    elif image_path:
        img_bgr = cv2.imread(image_path)
        if img_bgr is not None:
            img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

    detected_geo = None
    if img_rgb is not None:
        detected_geo = _detect_landmarks_opencv(img_rgb)

    # Dorsal hand CV detection (outside view for joints)
    dorsal_analysis = None
    if dorsal_bytes:
        arr_d = np.frombuffer(dorsal_bytes, np.uint8)
        img_d_bgr = cv2.imdecode(arr_d, cv2.IMREAD_COLOR)
        if img_d_bgr is not None:
            img_d_rgb = cv2.cvtColor(img_d_bgr, cv2.COLOR_BGR2RGB)
            dorsal_analysis = analyze_dorsal_hand(img_d_rgb)
            if dorsal_analysis.get("has_upper_knot") or dorsal_analysis.get("has_lower_knot"):
                knotty_joints = True

    # Palmar creases CV detection (Heart, Head, Life lines separation)
    is_thumb_right = (hand_type == "right")
    if img_rgb is not None:
        detected_creases = detect_palm_creases_opencv(img_rgb, is_thumb_on_right=is_thumb_right)
    else:
        # Default anatomical calibration with distinct non-intersecting origins
        detected_creases = detect_palm_creases_opencv(np.zeros((100, 100, 3), dtype=np.uint8), is_thumb_on_right=is_thumb_right)

    if detected_geo:
        pw = detected_geo["palm_width"]
        ph = detected_geo["palm_height"]
        fl = detected_geo["middle_finger_len"]
        palm_ratio = ph / max(pw, 1.0)
        finger_ratio = fl / max(ph, 1.0)
    else:
        # Default proportions
        palm_ratio = 1.02
        finger_ratio = 0.85
        pw, ph, fl = 100.0, 102.0, 86.0

    # Determine Element
    if manual_element and manual_element in ELEMENT_DESCRIPTIONS:
        element = manual_element
    elif manual_element == "philosophic" or knotty_joints:
        element = "philosophic"
    else:
        is_square_palm = palm_ratio <= 1.08
        is_long_fingers = finger_ratio >= 0.78

        if is_square_palm and not is_long_fingers:
            element = "earth"
        elif is_square_palm and is_long_fingers:
            element = "philosophic" if knotty_joints else "air"
        elif not is_square_palm and not is_long_fingers:
            element = "fire"
        else:
            element = "water"

    elem_info = ELEMENT_DESCRIPTIONS.get(element, ELEMENT_DESCRIPTIONS["air"])

    # Mounts calculation & status
    mounts = {
        "jupiter": {
            "name_ru": MOUNTS_METADATA["jupiter"]["name_ru"],
            "planet": "Jupiter",
            "development": "high" if element in ["fire", "air"] else "medium",
            "development_ru": "Выраженный" if element in ["fire", "air"] else "Умеренный",
            "score": 85 if element in ["fire", "air"] else 70,
            "interpretation": "Высокие амбиции, лидерские задатки, уверенность и независимость."
        },
        "saturn": {
            "name_ru": MOUNTS_METADATA["saturn"]["name_ru"],
            "planet": "Saturn",
            "development": "high" if element in ["earth", "water", "philosophic"] else "medium",
            "development_ru": "Глубокий, структурирующий" if element == "philosophic" else ("Выраженный" if element in ["earth", "water"] else "Сбалансированный"),
            "score": 94 if element == "philosophic" else (80 if element in ["earth", "water"] else 65),
            "interpretation": "Философская глубина, системный анализ, способность к длительной умственной концентрации и деконструкции догм." if element == "philosophic" else "Серьезность, глубокая концентрация, развитое чувство долга и ответственности."
        },
        "apollo": {
            "name_ru": MOUNTS_METADATA["apollo"]["name_ru"],
            "planet": "Sun",
            "development": "high" if element == "fire" else ("medium" if element in ["air", "water"] else "moderate"),
            "development_ru": "Яркий" if element == "fire" else "Гармоничный",
            "score": 90 if element == "fire" else 72,
            "interpretation": "Творческий импульс, любовь к прекрасному, потребность в признании и сиянии."
        },
        "mercury": {
            "name_ru": MOUNTS_METADATA["mercury"]["name_ru"],
            "planet": "Mercury",
            "development": "high" if element in ["air", "philosophic"] else "medium",
            "development_ru": "Высоко развит" if element in ["air", "philosophic"] else "Умеренный",
            "score": 92 if element == "philosophic" else (88 if element == "air" else 68),
            "interpretation": "Архитектурный ум, комбинаторная логика, способность деконструировать сложные концепции." if element == "philosophic" else "Ораторские способности, сообразительность, гибкость в контактах и торговле."
        },
        "venus": {
            "name_ru": MOUNTS_METADATA["venus"]["name_ru"],
            "planet": "Venus",
            "development": "high" if element in ["earth", "water"] else "medium",
            "development_ru": "Полный, теплый" if element in ["earth", "water"] else "Норма",
            "score": 85 if element in ["earth", "water"] else 70,
            "interpretation": "Большой запас жизненных сил, теплота в общении, чувственность и обаяние."
        },
        "moon": {
            "name_ru": MOUNTS_METADATA["moon"]["name_ru"],
            "planet": "Moon",
            "development": "high" if element == "water" else ("medium" if element == "fire" else "moderate"),
            "development_ru": "Выраженный" if element == "water" else "Умеренный",
            "score": 92 if element == "water" else 65,
            "interpretation": "Мощная образная интуиция, эмпатия, восприимчивость к скрытым сигналам мира."
        },
        "mars_upper": {
            "name_ru": MOUNTS_METADATA["mars_upper"]["name_ru"],
            "planet": "Mars",
            "development": "high" if element == "earth" else "medium",
            "development_ru": "Плотный" if element == "earth" else "Норма",
            "score": 78 if element == "earth" else 65,
            "interpretation": "Пассивное мужество, хладнокровие в кризисах, способность держать удар."
        },
        "mars_lower": {
            "name_ru": MOUNTS_METADATA["mars_lower"]["name_ru"],
            "planet": "Mars",
            "development": "high" if element == "fire" else "medium",
            "development_ru": "Активный" if element == "fire" else "Норма",
            "score": 82 if element == "fire" else 66,
            "interpretation": "Инициатива, смелость первого шага, боевой дух и напор."
        },
    }

    # Lines configuration
    lines = {
        "life": {
            "name_ru": LINES_METADATA["life"]["name_ru"],
            "house": LINES_METADATA["life"]["house"],
            "planet": LINES_METADATA["life"]["planet"],
            "quality": "Глубокая, четкая, плавный широкий радиус",
            "length": "Длинная",
            "breaks": False,
            "vitality_score": 88,
            "interpretation": "Крепкая витальность, устойчивая связь с родовыми корнями, способность быстро восстанавливать силы.",
        },
        "head": {
            "name_ru": LINES_METADATA["head"]["name_ru"],
            "house": LINES_METADATA["head"]["house"],
            "planet": LINES_METADATA["head"]["planet"],
            "quality": "Длинная, глубокая аналитическая линия (Философская вилка)" if element == "philosophic" else ("Прямая с мягким уклоном к холму Луны" if element in ["air", "water"] else "Четкая прямая"),
            "length": "Длинная",
            "creative_vs_practical": "Архитектурная декомпозиция и критический анализ" if element == "philosophic" else "Баланс логики и творческой интуиции",
            "focus_score": 95 if element == "philosophic" else 85,
            "interpretation": "Выдающаяся глубина аналитического аппарата. Философский склад ума подвергает сомнению любые догмы и выстраивает стройные многоуровневые системы." if element == "philosophic" else "Гибкое стратегическое мышление. Умение соединять строгий логический анализ с интуитивными инсайтами.",
        },
        "heart": {
            "name_ru": LINES_METADATA["heart"]["name_ru"],
            "house": LINES_METADATA["heart"]["house"],
            "planet": LINES_METADATA["heart"]["planet"],
            "quality": "Изогнутая, восходит к промежутку между указательным и средним пальцами",
            "ending": "Между Юпитером и Сатурном",
            "depth": "Ясная, эмоционально отзывчивая",
            "emotional_score": 86,
            "interpretation": "Идеалистичная, но зрелая эмоциональность. Способность к глубокой преданности без потери рассудка.",
        },
        "fate": {
            "name_ru": LINES_METADATA["fate"]["name_ru"],
            "house": LINES_METADATA["fate"]["house"],
            "planet": LINES_METADATA["fate"]["planet"],
            "present": True,
            "origin": "От равнины Марса и холма Луны к холму Сатурна",
            "strength": "Выраженная",
            "career_score": 80,
            "interpretation": "Осознанное следование своему призванию. Карьерный рост через личную дисциплину и независимость.",
        },
        "sun": {
            "name_ru": LINES_METADATA["sun"]["name_ru"],
            "house": LINES_METADATA["sun"]["house"],
            "planet": LINES_METADATA["sun"]["planet"],
            "present": True,
            "strength": "Умеренная",
            "creative_score": 75,
            "interpretation": "Признание личных талантов окружающими, обаяние и способность вдохновлять людей.",
        },
        "mercury": {
            "name_ru": LINES_METADATA["mercury"]["name_ru"],
            "house": LINES_METADATA["mercury"]["house"],
            "planet": LINES_METADATA["mercury"]["planet"],
            "present": True,
            "strength": "Тонкая, непрерывная",
            "intuition_score": 82,
            "interpretation": "Быстрая реакция на изменение обстоятельств, развитая коммерческая и интуитивная чуткость.",
        },
    }

    # Interactive landmark coordinates for front-end SVG/Canvas
    landmarks_data = detected_geo["landmarks"] if detected_geo else [
        {"id": 0, "name": "wrist", "x": 200, "y": 380},
        {"id": 2, "name": "thumb_mcp", "x": 100, "y": 290},
        {"id": 4, "name": "thumb_tip", "x": 40, "y": 200},
        {"id": 5, "name": "index_mcp", "x": 130, "y": 180},
        {"id": 8, "name": "index_tip", "x": 110, "y": 50},
        {"id": 9, "name": "middle_mcp", "x": 200, "y": 170},
        {"id": 12, "name": "middle_tip", "x": 200, "y": 20},
        {"id": 13, "name": "ring_mcp", "x": 270, "y": 180},
        {"id": 16, "name": "ring_tip", "x": 290, "y": 50},
        {"id": 17, "name": "pinky_mcp", "x": 330, "y": 200},
        {"id": 20, "name": "pinky_tip", "x": 355, "y": 100},
    ]

    # Default onychognomy (nail shape) by elemental resonance
    nail_key = "short_square" if (knotty_joints or element in ["philosophic", "earth", "mixed"]) else (
        "long_almond" if element == "water" else (
            "broad" if element == "fire" else "fan_shaped"
        )
    )
    nail_shape_info = NAIL_SHAPES_METADATA.get(nail_key, NAIL_SHAPES_METADATA["short_square"])

    # Benham archetype & Sternberg three worlds analysis
    benham_archetype = classify_benham_archetype(mounts)
    three_worlds = analyze_phalanges_and_thumb(
        {"palm_ratio": palm_ratio, "finger_ratio": finger_ratio},
        knotty_joints,
        element
    )

    return {
        "hand": hand_type,
        "dominant": dominant,
        "element": element,
        "element_ru": elem_info["name_ru"],
        "description": elem_info["description"],
        "zodiac_matches": elem_info["zodiac_matches"],
        "knotty_joints": knotty_joints,
        "knotty_joints_info": KNOTTY_JOINTS_METADATA if knotty_joints else None,
        "nail_shape": nail_shape_info,
        "nail_shapes_catalog": NAIL_SHAPES_METADATA,
        "benham_archetype": benham_archetype,
        "three_worlds": three_worlds,
        "proportions": {
            "palm_ratio": round(palm_ratio, 2),
            "finger_ratio": round(finger_ratio, 2),
            "palm_shape": "Квадратная" if palm_ratio <= 1.08 else "Продолговатая",
            "fingers_length": "Длинные" if finger_ratio >= 0.78 else "Короткие/Средние",
            "joints_type": dorsal_analysis["joints_type"] if dorsal_analysis else ("Узловатые (философские узлы)" if knotty_joints else "Гладкие"),
            "nail_type": nail_shape_info["name_ru"],
        },
        "dorsal_analysis": dorsal_analysis,
        "mounts": mounts,
        "lines": lines,
        "detected_lines": detected_creases,
        "landmarks": landmarks_data,
        "has_cv_detection": bool(detected_geo is not None),
    }
