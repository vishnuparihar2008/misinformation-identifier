import re
from typing import Literal
from langdetect import detect, DetectorFactory

# Set seed for deterministic detection
DetectorFactory.seed = 0

HINGLISH_KEYWORDS = {
    "hai", "hain", "karo", "kare", "karna", "warna", "jayega", "hoga", "hogi",
    "sabke", "liye", "bhejo", "bhai", "aaj", "kal", "nahin", "nahi", "hota",
    "raha", "rahi", "rahe", "meri", "mera", "mere", "yeh", "woh", "kya", "kyun",
    "aap", "tum", "bhi", "bahut", "mat", "baat", "shuru", "band", "sabko", "jaldi",
    "dekho", "suno", "khabar", "sach", "jhooth", "paise", "kaam", "logo", "logon"
}

DEVANAGARI_REGEX = re.compile(r"[\u0900-\u097F]")


def detect_language(text: str, language_hint: str | None = None) -> Literal["en", "hi", "hinglish", "other"]:
    """
    Detects language with support for code-mixed Hinglish, Devanagari Hindi, and English.
    Respects language_hint if valid and aligned.
    """
    if language_hint and language_hint.lower() in {"en", "hi", "hinglish", "other"}:
        return language_hint.lower()  # type: ignore

    if not text or not text.strip():
        return "en"

    # Check for Devanagari Hindi script
    devanagari_count = len(DEVANAGARI_REGEX.findall(text))
    if devanagari_count > 3:
        return "hi"

    # Tokenize words for Hinglish detection
    words = re.findall(r"\b[a-zA-Z]+\b", text.lower())
    if words:
        hinglish_hits = sum(1 for word in words if word in HINGLISH_KEYWORDS)
        hinglish_ratio = hinglish_hits / len(words)
        # If at least 2 keywords or > 12% matches
        if hinglish_hits >= 2 or (len(words) >= 3 and hinglish_ratio >= 0.12):
            return "hinglish"

    # Fallback to langdetect
    try:
        detected = detect(text)
        if detected == "en":
            return "en"
        elif detected == "hi":
            return "hi"
        else:
            return "other"
    except Exception:
        return "en"

