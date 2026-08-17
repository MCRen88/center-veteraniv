import json
import re
from check_all_pdf_data import load_pdf_text, parse_pdf_sections, parse_questions_from_section, parse_cases_from_section

def normalize(text):
    if not text:
        return ""
    text = text.replace('\xa0', ' ').replace('’', "'").replace('`', "'").replace('\'', "'")
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

if __name__ == '__main__':
    pdf_text = load_pdf_text()
    sec_map = parse_pdf_sections(pdf_text)
    
    pdf_v1_qs = parse_questions_from_section(sec_map['Контрольно-оцінювальні матеріали (тестові завдання) варіант 1'])
    pdf_v2_qs = parse_questions_from_section(sec_map['Контрольно-оцінювальні матеріали (тестові завдання) варіант 2'])
    
    pdf_task1_cs = parse_cases_from_section(sec_map['Комплексне кваліфікаційне (практичне) завдання №1'])
    pdf_task2_cs = parse_cases_from_section(sec_map['Комплексне кваліфікаційне (практичне) завдання №2'])
    
    with open('docs/questionsDb.json', 'r', encoding='utf-8') as f:
        q_db = json.load(f)
        
    with open('docs/casesDb.json', 'r', encoding='utf-8') as f:
        c_db = json.load(f)
        
    with open('docs/variant1Questions.json', 'r', encoding='utf-8') as f:
        v1_q_titles = json.load(f)
        
    with open('docs/variant2Questions.json', 'r', encoding='utf-8') as f:
        v2_q_titles = json.load(f)
        
    print(f"PDF Variant 1 Questions: {len(pdf_v1_qs)}")
    print(f"PDF Variant 2 Questions: {len(pdf_v2_qs)}")
    print(f"PDF Task 1 Cases: {len(pdf_task1_cs)}")
    print(f"PDF Task 2 Cases: {len(pdf_task2_cs)}")
    print("-" * 50)
    print(f"questionsDb.json Questions: {len(q_db)}")
    print(f"casesDb.json Cases: {len(c_db)}")
    print(f"variant1Questions: {len(v1_q_titles)}")
    print(f"variant2Questions: {len(v2_q_titles)}")
    print("=" * 50)
    
    # 1. Compare Variant 1 titles in code vs PDF V1
    print("--- Checking Variant 1 Question Titles ---")
    v1_mismatches = []
    for idx, (pdf_q, v1_t) in enumerate(zip(pdf_v1_qs, v1_q_titles)):
        if normalize(pdf_q['question']) != normalize(v1_t):
            v1_mismatches.append((idx+1, pdf_q['question'], v1_t))
    if v1_mismatches:
        print(f"Found {len(v1_mismatches)} mismatches in Variant 1 question titles:")
        for num, pdf_t, code_t in v1_mismatches[:5]:
            print(f"  V1 Q{num}:\n    PDF:  {pdf_t}\n    CODE: {code_t}")
    else:
        print("✓ All 50 Variant 1 titles match PDF!")

    # 2. Compare Variant 2 titles in code vs PDF V2
    print("--- Checking Variant 2 Question Titles ---")
    v2_mismatches = []
    for idx, (pdf_q, v2_t) in enumerate(zip(pdf_v2_qs, v2_q_titles)):
        if normalize(pdf_q['question']) != normalize(v2_t):
            v2_mismatches.append((idx+1, pdf_q['question'], v2_t))
    if v2_mismatches:
        print(f"Found {len(v2_mismatches)} mismatches in Variant 2 question titles:")
        for num, pdf_t, code_t in v2_mismatches[:5]:
            print(f"  V2 Q{num}:\n    PDF:  {pdf_t}\n    CODE: {code_t}")
    else:
        print("✓ All 50 Variant 2 titles match PDF!")

    # 3. Check if all PDF questions exist in questionsDb.ts
    print("-" * 50)
    print("--- Checking PDF Questions against questionsDb.ts ---")
    q_db_dict = {normalize(q['question']): q for q in q_db}
    
    missing_in_db = []
    option_mismatches = []
    
    all_pdf_qs = [("V1", q) for q in pdf_v1_qs] + [("V2", q) for q in pdf_v2_qs]
    
    for v_name, pdf_q in all_pdf_qs:
        norm_q = normalize(pdf_q['question'])
        if norm_q not in q_db_dict:
            missing_in_db.append((v_name, pdf_q['num'], pdf_q['question']))
        else:
            db_q = q_db_dict[norm_q]
            # Check options
            for opt_idx, (pdf_opt, db_opt) in enumerate(zip(pdf_q['options'], db_q['options'])):
                if normalize(pdf_opt) != normalize(db_opt):
                    option_mismatches.append((v_name, pdf_q['num'], pdf_q['question'], opt_idx+1, pdf_opt, db_opt))
                    
    print(f"Questions in PDF missing from questionsDb.ts: {len(missing_in_db)}")
    for v_name, num, text in missing_in_db:
        print(f"  [{v_name} Q{num}] {text[:70]}...")
        
    print(f"Option mismatches between PDF and questionsDb.ts: {len(option_mismatches)}")
    for v_name, num, q_text, opt_num, pdf_opt, db_opt in option_mismatches[:10]:
        print(f"  [{v_name} Q{num}] Option {opt_num}:\n    PDF:  {pdf_opt}\n    DB:   {db_opt}")

    # 4. Check casesDb.ts against PDF Task 1 & Task 2
    print("-" * 50)
    print("--- Checking Cases (casesDb.ts) against PDF Practical Tasks 1 & 2 ---")
    all_pdf_cases = [("Task 1", c) for c in pdf_task1_cs] + [("Task 2", c) for c in pdf_task2_cs]
    
    case_diffs = []
    if len(c_db) != len(all_pdf_cases):
        case_diffs.append(f"Count mismatch: DB has {len(c_db)} cases, PDF has {len(all_pdf_cases)} cases")
        
    for idx, (task_name, pdf_c) in enumerate(all_pdf_cases):
        if idx >= len(c_db):
            case_diffs.append(f"[{task_name} Case {pdf_c['num_str']}] missing in casesDb.ts")
            continue
        db_c = c_db[idx]
        
        pdf_title_clean = re.sub(r'^(Кейс \d+\.?|\d+\.?)\s*', '', pdf_c['title']).strip()
        db_title_clean = re.sub(r'^(Кейс \d+\.?|\d+\.?)\s*', '', db_c['title']).strip()
        
        if normalize(pdf_title_clean) != normalize(db_title_clean):
            case_diffs.append(f"Case {idx+1} Title mismatch:\n  PDF:  {pdf_title_clean}\n  DB:   {db_title_clean}")
            
        if normalize(pdf_c['description']) != normalize(db_c['situation']):
            case_diffs.append(f"Case {idx+1} Situation/Description mismatch:\n  PDF:  {pdf_c['description']}\n  DB:   {db_c['situation']}")
            
        if normalize(pdf_c['question']) != normalize(db_c['question']):
            case_diffs.append(f"Case {idx+1} Question mismatch:\n  PDF:  {pdf_c['question']}\n  DB:   {db_c['question']}")
            
        if len(pdf_c['options']) != len(db_c['options']):
            case_diffs.append(f"Case {idx+1} Options count mismatch: PDF {len(pdf_c['options'])} vs DB {len(db_c['options'])}")
        else:
            for opt_i, (pdf_opt, db_opt) in enumerate(zip(pdf_c['options'], db_c['options'])):
                if normalize(pdf_opt) != normalize(db_opt):
                    case_diffs.append(f"Case {idx+1} Option {opt_i+1} mismatch:\n  PDF:  {pdf_opt}\n  DB:   {db_opt}")
                    
    if case_diffs:
        print(f"Found {len(case_diffs)} mismatches in casesDb.ts:")
        for d in case_diffs[:15]:
            print(d)
            print("~" * 40)
        if len(case_diffs) > 15:
            print(f"... and {len(case_diffs) - 15} more case mismatches")
    else:
        print("✓ All 20 cases and their options match PDF perfectly!")
