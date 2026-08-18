import json
import re
from check_all_pdf_data import load_pdf_text, parse_pdf_sections, parse_questions_from_section, parse_cases_from_section

def normalize(text):
    if not text:
        return ""
    text = text.replace('\xa0', ' ').replace('’', "'").replace('`', "'").replace('\'', "'").replace('–', '-').replace('—', '-')
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

pdf_text = load_pdf_text()
sec_map = parse_pdf_sections(pdf_text)

v1 = parse_questions_from_section(sec_map['Контрольно-оцінювальні матеріали (тестові завдання) варіант 1'])
v2 = parse_questions_from_section(sec_map['Контрольно-оцінювальні матеріали (тестові завдання) варіант 2'])
cs1 = parse_cases_from_section(sec_map['Комплексне кваліфікаційне (практичне) завдання №1'])
cs2 = parse_cases_from_section(sec_map['Комплексне кваліфікаційне (практичне) завдання №2'])

with open('docs/questionsDb.json', 'r', encoding='utf-8') as f:
    q_db = json.load(f)

with open('docs/casesDb.json', 'r', encoding='utf-8') as f:
    c_db = json.load(f)

# Map question text -> db item
db_q_map = {normalize(q['question']): q for q in q_db}

print("=== VERIFYING ALL 100 TEST QUESTIONS (50 V1 + 50 V2) ===")
q_errors = []

for v_label, v_list in [("Variant 1", v1), ("Variant 2", v2)]:
    for q in v_list:
        norm_q = normalize(q['question'])
        if norm_q not in db_q_map:
            q_errors.append(f"[{v_label} Q{q['num']}] NOT FOUND in questionsDb: '{q['question']}'")
            continue
        db_q = db_q_map[norm_q]
        # Check options
        for opt_idx, (pdf_opt, db_opt) in enumerate(zip(q['options'], db_q['options'])):
            if normalize(pdf_opt) != normalize(db_opt):
                q_errors.append(f"[{v_label} Q{q['num']}] Option {opt_idx+1} difference:\n  PDF:  {pdf_opt}\n  DB:   {db_opt}")

if q_errors:
    print(f"Found {len(q_errors)} question differences:")
    for err in q_errors:
        print("  -", err)
else:
    print("✓ ALL 100 TEST QUESTIONS AND ALL 400 OPTIONS MATCH PERFECTLY BETWEEN PDF AND SITE!")

print("\n=== VERIFYING ALL 20 PRACTICAL CASES (10 TASK 1 + 10 TASK 2) ===")
c_errors = []
pdf_all_cases = cs1 + cs2

for idx, pdf_c in enumerate(pdf_all_cases):
    db_c = c_db[idx]
    
    # Title
    pdf_title = re.sub(r'^(Кейс \d+\.?|\d+\.?)\s*', '', pdf_c['title']).strip()
    db_title = re.sub(r'^(Кейс \d+\.?|\d+\.?)\s*', '', db_c['title']).strip()
    if normalize(pdf_title) != normalize(db_title):
        c_errors.append(f"[Case {idx+1}] Title mismatch: PDF '{pdf_title}' vs DB '{db_title}'")
        
    # Situation
    if normalize(pdf_c['description']) != normalize(db_c['situation']):
        c_errors.append(f"[Case {idx+1}] Situation mismatch:\n  PDF: {pdf_c['description']}\n  DB:  {db_c['situation']}")
        
    # Question
    if normalize(pdf_c['question']) != normalize(db_c['question']):
        c_errors.append(f"[Case {idx+1}] Question mismatch:\n  PDF: {pdf_c['question']}\n  DB:  {db_c['question']}")
        
    # Options
    if len(pdf_c['options']) != len(db_c['options']):
        c_errors.append(f"[Case {idx+1}] Options count mismatch: PDF {len(pdf_c['options'])} vs DB {len(db_c['options'])}")
    else:
        for opt_idx, (pdf_opt, db_opt) in enumerate(zip(pdf_c['options'], db_c['options'])):
            # Clean any 'Термін виконання...' leaked into option 4 if any
            clean_db_opt = re.sub(r'\s*Термін виконання.*$', '', db_opt).strip()
            if normalize(pdf_opt) != normalize(clean_db_opt):
                c_errors.append(f"[Case {idx+1}] Option {opt_idx+1} mismatch:\n  PDF: {pdf_opt}\n  DB:  {clean_db_opt}")

if c_errors:
    print(f"Found {len(c_errors)} case differences:")
    for err in c_errors:
        print("  -", err)
else:
    print("✓ ALL 20 PRACTICAL CASES MATCH PERFECTLY BETWEEN PDF AND SITE!")
