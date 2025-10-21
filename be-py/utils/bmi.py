# be-py/utils/bmi.py
from datetime import date

def age_in_months(dob: date) -> int:
    today = date.today()
    return (today.year - dob.year)*12 + (today.month - dob.month) - (1 if today.day < dob.day else 0)

def bmi_status(bmi: float) -> str:
    if bmi is None: return "unknown"
    if bmi < 14: return "underweight"
    if bmi < 18: return "normal"
    if bmi < 20: return "overweight"
    return "obese"
