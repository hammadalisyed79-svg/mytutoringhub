"""Convert the desktop Excel curriculum catalog into JSON with unique subject codes."""

from __future__ import annotations

import json
import re
from pathlib import Path

import openpyxl

SRC = Path(r"C:\Tutor\data\MyTutoringHub_Curriculum_Database.xlsx")
OUT = Path(r"C:\Tutor\src\data\curriculum.json")

SUBJECT_CODES = {
    "Mathematics": "MATH",
    "Physics": "PHY",
    "Chemistry": "CHEM",
    "Biology": "BIO",
    "English": "ENG",
    "Economics": "ECON",
    "Business": "BUS",
    "Science": "SCI",
    "Psychology": "PSY",
    "Computer Science": "CS",
    "Geography": "GEO",
    "History": "HIST",
    "Social Studies": "SS",
    "Accounting": "ACC",
    "Arabic": "AR",
    "Statistics": "STAT",
    "German": "GER",
    "Calculus": "CALC",
    "Social Science": "SSCI",
    "Computing": "COMP",
    "French": "FR",
    "Chinese": "CHI",
    "Commerce": "COMM",
    "English Language Arts": "ELA",
    "Humanities": "HUM",
    "Bahasa Melayu": "BM",
    "Additional Mathematics": "ADD",
    "Social Sciences": "SSCS",
    "Technology": "TECH",
    "Business Studies": "BST",
    "Life Sciences": "LIFE",
    "Physical Sciences": "PSCI",
    "Languages": "LANG",
    "General Studies": "GS",
    "Computer Applications": "CA",
    "Health": "HLTH",
    "Further Mathematics": "FMTH",
    "Natural Sciences": "NSCI",
    "Biology/Life Sciences": "BIO",
    "Chemistry/Physical Sciences": "CHEM",
    "Islamic Studies": "ISL",
    "Reading": "READ",
    "Calculus AB": "CAB",
    "Calculus BC": "CBC",
    "Reading and Writing": "RW",
}

BOARD_CODES = {
    "ACT": "ACT",
    "ACT BSSS": "BSSS",
    "AP": "AP",
    "AQA": "AQA",
    "Abitur": "ABIT",
    "Aga Khan Examination Board": "AKEB",
    "AJK Board": "AJK",
    "Alberta": "AB",
    "American": "US",
    "Australian Curriculum": "ACARA",
    "Balochistan Board": "BB",
    "British": "UK",
    "British Columbia": "BC",
    "Cambridge A Level": "CAL",
    "Cambridge AS/A Level": "CASAL",
    "Cambridge IGCSE": "CIGC",
    "Cambridge International": "CAIE",
    "Cambridge O Level": "COL",
    "CAPS": "CAPS",
    "CBSE": "CBSE",
    "CCEA": "CCEA",
    "CISCE / ICSE": "ICSE",
    "Common Core / State Standards": "CCSS",
    "CUET": "CUET",
    "FBISE": "FBISE",
    "French": "FR",
    "German": "DE",
    "German National / State Curriculum": "DECUR",
    "Gymnasium": "GYM",
    "HKDSE": "HKDSE",
    "Hong Kong Curriculum": "HK",
    "IB": "IB",
    "IEB": "IEB",
    "ISC": "ISC",
    "JEE": "JEE",
    "KPK Board": "KPK",
    "Malaysian National Curriculum / KSSM": "KSSM",
    "Manitoba": "MB",
    "NCEA": "NCEA",
    "NEET": "NEET",
    "New Zealand Curriculum": "NZC",
    "Nova Scotia": "NS",
    "NSC / Matric": "NSC",
    "NSW HSC": "HSC",
    "OCR": "OCR",
    "Ontario": "ON",
    "Pakistani": "PK",
    "Pearson Edexcel": "EDX",
    "Punjab Board": "PB",
    "Qatar National Curriculum": "QNC",
    "Quebec": "QC",
    "Queensland QCE": "QCE",
    "SAT": "SAT",
    "Saudi National Curriculum": "SNC",
    "Sindh Board": "SB",
    "Singapore-Cambridge A Level": "SGAL",
    "Singapore-Cambridge O Level": "SGOL",
    "Singapore-Cambridge SEC": "SGSEC",
    "South Australia SACE": "SACE",
    "SPM": "SPM",
    "SQA": "SQA",
    "State Boards": "STB",
    "STPM": "STPM",
    "Tasmania TCE": "TCE",
    "UAE National Curriculum": "UAENC",
    "UEC": "UEC",
    "Victoria VCE": "VCE",
    "Western Australia WACE": "WACE",
    "WJEC / Eduqas": "WJEC",
}

LEVEL_CODES = {
    "A Level": "AL",
    "AS Level": "AS",
    "Advanced Higher": "AH",
    "AP": "AP",
    "Classes 1–10": "C110",
    "Classes 11–12": "C1112",
    "DP": "DP",
    "Elementary": "EL",
    "Elementary–Secondary": "ELSEC",
    "Foundation–Year 10": "FY10",
    "GCSE": "GCSE",
    "GCSE/IGCSE": "GCIG",
    "Grade 1–12": "G112",
    "Grade 10–12": "G1012",
    "Grade 12": "G12",
    "Grade R–9": "GR9",
    "Grades 1–8": "G18",
    "Grades 9–12": "G912",
    "High School": "HS",
    "Higher": "HIG",
    "HSSC": "HSSC",
    "IGCSE": "IGCSE",
    "Intermediate": "INT",
    "International GCSE": "IGC",
    "K–12": "K12",
    "KS1": "KS1",
    "KS2": "KS2",
    "KS3": "KS3",
    "Level 1": "L1",
    "Level 2": "L2",
    "Level 3": "L3",
    "Matric": "MAT",
    "Middle School": "MS",
    "MYP": "MYP",
    "National 4/5": "N45",
    "O Level": "OL",
    "P–12": "P12",
    "Pre-University": "PREU",
    "Primary": "PRI",
    "Primary–Secondary": "PRSEC",
    "PYP": "PYP",
    "Secondary": "SEC",
    "Senior Secondary": "SSEC",
    "SSC": "SSC",
    "Upper Secondary": "USEC",
    "Years 1–10": "Y110",
    "Years 11–12": "Y1112",
}


def clean(value) -> str:
    text = "" if value is None else str(value)
    text = text.replace("\uFFFD", "–")
    text = text.replace("\u2013", "–").replace("\u2014", "–")
    return re.sub(r"\s+", " ", text).strip()


def abbr_words(text: str, limit: int = 6) -> str:
    words = re.findall(r"[A-Za-z0-9]+", text)
    if not words:
        return "X"
    if len(words) == 1:
        return words[0][:limit].upper()
    return "".join(w[0] for w in words)[:limit].upper()


def subject_code(name: str) -> str:
    return SUBJECT_CODES.get(name) or abbr_words(name, 5)


def board_code(name: str) -> str:
    return BOARD_CODES.get(name) or abbr_words(name, 6)


def level_code(name: str) -> str:
    return LEVEL_CODES.get(name) or abbr_words(name, 5)


def main() -> None:
    wb = openpyxl.load_workbook(SRC, data_only=True)
    ws = wb.active
    used: dict[str, int] = {}
    entries = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        country, board, level, subject, exam = (clean(v) for v in row[:5])
        if not country or not subject:
            continue
        # Codes are unique within a country so IB-DP-MATH can appear in every IB market.
        base = f"{board_code(board)}-{level_code(level)}-{subject_code(subject)}"
        key = f"{country}:{base}"
        count = used.get(key, 0) + 1
        used[key] = count
        code = base if count == 1 else f"{base}-{count}"
        entries.append(
            {
                "country": country,
                "board": board,
                "level": level,
                "subject": subject,
                "exam": exam,
                "code": code,
            }
        )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8")
    codes = [e["code"] for e in entries]
    print(f"wrote {len(entries)} rows to {OUT}")
    print("unique codes", len(set(codes)), "max len", max(len(c) for c in codes))
    print("sample PK:", [e["code"] for e in entries if e["country"] == "Pakistan"][:12])


if __name__ == "__main__":
    main()
