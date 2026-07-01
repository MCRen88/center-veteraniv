import json
import re

def parse_sql_values(sql):
    start_idx = sql.find("VALUES") + 6
    values_str = sql[start_idx:].strip()
    
    rows = []
    current_row = []
    in_string = False
    in_tuple = False
    current_str = []
    
    i = 0
    while i < len(values_str):
        c = values_str[i]
        if not in_tuple:
            if c == '(':
                in_tuple = True
                current_row = []
            i += 1
            continue
            
        if in_string:
            if c == "'":
                if i + 1 < len(values_str) and values_str[i+1] == "'":
                    current_str.append("'")
                    i += 2
                    continue
                else:
                    in_string = False
                    current_row.append("".join(current_str))
                    current_str = []
                    i += 1
            else:
                current_str.append(c)
                i += 1
        else:
            if c == "'":
                in_string = True
                i += 1
            elif c == ")":
                in_tuple = False
                rows.append(current_row)
                i += 1
            elif c.isdigit():
                num = []
                while i < len(values_str) and values_str[i].isdigit():
                    num.append(values_str[i])
                    i += 1
                current_row.append(int("".join(num)))
            elif c == ':':
                if values_str[i:i+7] == "::jsonb":
                    i += 7
                else:
                    i += 1
            else:
                i += 1
    return rows

with open('questions.json', 'r', encoding='utf-8') as f:
    parsed_qs = json.load(f)

with open('../supabase/migrations/003_seed.sql', 'r', encoding='utf-8') as f:
    seed_sql = f.read()

rows = parse_sql_values(seed_sql)

print(f"Parsed questions from docx: {len(parsed_qs)}")
print(f"Seed questions parsed: {len(rows)}")

differences = []

for i in range(max(len(parsed_qs), len(rows))):
    if i >= len(rows):
        differences.append(f"Question {i+1} exists in parsed but not in seed.")
        continue
    if i >= len(parsed_qs):
        differences.append(f"Question {i+1} exists in seed but not in parsed.")
        continue
        
    pq = parsed_qs[i]
    sr = rows[i]
    
    # sr is [cat_id, cat_name, question, options_str, correct, explanation]
    scat_id, scat_name, squestion, soptions_str, scorrect, sexplanation = sr
    
    try:
        soptions = json.loads(soptions_str)
    except Exception as e:
        soptions = []
        print(f"Error parsing seed options for Q{i+1}: {e}")
        
    q_diffs = []
    if pq['cat_id'] != scat_id:
        q_diffs.append(f"cat_id: '{pq['cat_id']}' vs '{scat_id}'")
    if pq['cat_name'] != scat_name:
        q_diffs.append(f"cat_name: '{pq['cat_name']}' vs '{scat_name}'")
    if pq['question'].strip() != squestion.strip():
        q_diffs.append(f"question: '{pq['question']}' vs '{squestion}'")
    if pq['correct'] != scorrect:
        q_diffs.append(f"correct: {pq['correct']} vs {scorrect}")
    if pq['explanation'].strip() != sexplanation.strip():
        q_diffs.append(f"explanation: '{pq['explanation']}' vs '{sexplanation}'")
        
    if len(pq['options']) != len(soptions):
        q_diffs.append(f"options count: {len(pq['options'])} vs {len(soptions)}")
    else:
        for opt_idx, (p_opt, s_opt) in enumerate(zip(pq['options'], soptions)):
            if p_opt.strip() != s_opt.strip():
                q_diffs.append(f"option {opt_idx}: '{p_opt}' vs '{s_opt}'")
                
    if q_diffs:
        differences.append(f"Question {i+1} differences:\n  " + "\n  ".join(q_diffs))

if differences:
    print(f"Found {len(differences)} differences:")
    for d in differences[:10]:
        print(d)
        print("-" * 40)
    if len(differences) > 10:
        print("...")
else:
    print("No differences found! The questions are identical.")
