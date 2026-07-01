import re
import json
import sys

def parse_txt(path):
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    questions = []
    current_cat_id = None
    current_cat_name = None
    
    current_question = None
    q_cat_id = None
    q_cat_name = None
    options = []
    correct_idx = None
    explanation = None
    
    state = 0
    
    for line_idx, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
            
        section_match = re.match(r'^Розділ\s+([А-ЯІЇЄ]):\s*(.*)$', line, re.IGNORECASE)
        if section_match:
            current_cat_id = section_match.group(1).upper()
            current_cat_name = section_match.group(2).strip()
            continue
            
        question_match = re.match(r'^Питання\s+(\d+)\.\s*(.*)$', line, re.IGNORECASE)
        if question_match:
            if current_question:
                if correct_idx is None:
                    print(f"Error: Question {len(questions) + 1} has no correct answer marked.")
                questions.append({
                    "cat_id": q_cat_id,
                    "cat_name": q_cat_name,
                    "question": current_question,
                    "options": options,
                    "correct": correct_idx,
                    "explanation": explanation
                })
            
            current_question = question_match.group(2).strip()
            q_cat_id = current_cat_id
            q_cat_name = current_cat_name
            options = []
            correct_idx = None
            explanation = None
            state = 1
            continue
            
        if state == 1:
            if line.startswith("Пояснення:"):
                explanation = line[len("Пояснення:"):].strip()
                state = 2
            else:
                is_correct = False
                clean_option = line
                if "✓" in line or "(Правильна відповідь)" in line:
                    is_correct = True
                    clean_option = re.sub(r'\s*✓\s*(\(Правильна відповідь\))?', '', clean_option).strip()
                options.append(clean_option)
                if is_correct:
                    correct_idx = len(options) - 1
        elif state == 2:
            if explanation:
                explanation += " " + line
            else:
                explanation = line
                
    if current_question:
        if correct_idx is None:
            print(f"Error: Last question has no correct answer marked.")
        questions.append({
            "cat_id": q_cat_id,
            "cat_name": q_cat_name,
            "question": current_question,
            "options": options,
            "correct": correct_idx,
            "explanation": explanation
        })
        
    return questions

if __name__ == '__main__':
    questions = parse_txt("Тестові питання.txt")
    print(f"Total questions parsed: {len(questions)}")
    with open("questions.json", "w", encoding="utf-8") as f:
        json.dump(questions, f, indent=2, ensure_ascii=False)
