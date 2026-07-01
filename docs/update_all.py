import os
import json
import zipfile
import xml.etree.ElementTree as ET
import re

def extract_docx_text(path):
    ns = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
    p_tag = ns + 'p'
    t_tag = ns + 't'
    tr_tag = ns + 'tr'
    tc_tag = ns + 'tc'
    tbl_tag = ns + 'tbl'
    
    with zipfile.ZipFile(path) as docx:
        tree = ET.parse(docx.open('word/document.xml'))
        root = tree.getroot()
        
        out = []
        body = root.find(ns + 'body')
        if body is not None:
            for child in body:
                if child.tag == tbl_tag:
                    for row in child.iter(tr_tag):
                        row_texts = []
                        for cell in row.iter(tc_tag):
                            cell_texts = []
                            for p in cell.iter(p_tag):
                                cell_p_texts = [t.text for t in p.iter(t_tag) if t.text]
                                if cell_p_texts:
                                    cell_texts.append(''.join(cell_p_texts))
                            row_texts.append(' '.join(cell_texts))
                        out.append(' | '.join(row_texts))
                elif child.tag == p_tag:
                    texts = [t.text for t in child.iter(t_tag) if t.text]
                    if texts:
                        out.append(''.join(texts))
        return '\n'.join(out)

def parse_txt_content(text):
    lines = text.split('\n')
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

def update_seed_sql(questions):
    seed_path = '../supabase/migrations/003_seed.sql'
    sql_header = "-- Seed Questions\nINSERT INTO public.questions (cat_id, cat_name, question, options, correct, explanation) VALUES\n"
    
    value_rows = []
    for q in questions:
        cat_id = q['cat_id'].replace("'", "''")
        cat_name = q['cat_name'].replace("'", "''")
        question = q['question'].replace("'", "''")
        options_json = json.dumps(q['options'], ensure_ascii=False).replace("'", "''")
        correct = q['correct']
        
        if q['explanation']:
            explanation = "'" + q['explanation'].replace("'", "''") + "'"
        else:
            explanation = "NULL"
            
        row = f"('{cat_id}', '{cat_name}', '{question}', '{options_json}'::jsonb, {correct}, {explanation})"
        value_rows.append(row)
        
    sql_content = sql_header + ",\n".join(value_rows) + ";\n"
    
    with open(seed_path, 'w', encoding='utf-8') as f:
        f.write(sql_content)
    print("003_seed.sql updated successfully.")

def update_migration_sql(questions):
    mig_path = '../supabase/migrations/004_update_questions.sql'
    sql_header = f"""-- Database Migration: Update test questions to the latest bank ({len(questions)} questions)
-- Generated automatically from docs/Тестові питання.docx / 003_seed.sql

-- Clear existing questions and restart autoincrement ID sequence
TRUNCATE public.questions RESTART IDENTITY;

-- Insert all {len(questions)} questions
INSERT INTO public.questions (cat_id, cat_name, question, options, correct, explanation) VALUES
"""
    
    value_rows = []
    for q in questions:
        cat_id = q['cat_id'].replace("'", "''")
        cat_name = q['cat_name'].replace("'", "''")
        question = q['question'].replace("'", "''")
        options_json = json.dumps(q['options'], ensure_ascii=False).replace("'", "''")
        correct = q['correct']
        
        if q['explanation']:
            explanation = "'" + q['explanation'].replace("'", "''") + "'"
        else:
            explanation = "NULL"
            
        row = f"('{cat_id}', '{cat_name}', '{question}', '{options_json}'::jsonb, {correct}, {explanation})"
        value_rows.append(row)
        
    sql_content = sql_header + ",\n".join(value_rows) + ";\n"
    
    with open(mig_path, 'w', encoding='utf-8') as f:
        f.write(sql_content)
    print("004_update_questions.sql updated successfully.")

def update_ts_db(questions):
    ts_path = '../src/data/questionsDb.ts'
    ts_header = """export interface Question {
  id: number;
  catId: string;
  catName: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export const questionsDb: Question[] = [
"""
    
    ts_rows = []
    for idx, q in enumerate(questions):
        ts_q = {
            "id": idx + 1,
            "catId": q['cat_id'],
            "catName": q['cat_name'],
            "question": q['question'],
            "options": q['options'],
            "correct": q['correct'],
            "explanation": q['explanation'] or ""
        }
        ts_rows.append(json.dumps(ts_q, indent=2, ensure_ascii=False))
        
    formatted_rows = []
    for row in ts_rows:
        indented_row = "\n".join("  " + line for line in row.split("\n"))
        formatted_rows.append(indented_row)
        
    ts_content = ts_header + ",\n".join(formatted_rows) + "\n];\n"
    
    with open(ts_path, 'w', encoding='utf-8') as f:
        f.write(ts_content)
    print("questionsDb.ts updated successfully.")

def main():
    docx_path = "Тестові питання.docx"
    txt_path = "Тестові_питання_extracted.txt"
    json_path = "questions.json"
    
    print("1. Extracting text from DOCX...")
    text = extract_docx_text(docx_path)
    with open(txt_path, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f"Text written to {txt_path}")
    
    print("2. Parsing extracted text...")
    questions = parse_txt_content(text)
    print(f"Parsed {len(questions)} questions.")
    
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(questions, f, indent=2, ensure_ascii=False)
    print(f"Questions dumped to {json_path}")
    
    print("3. Updating 003_seed.sql...")
    update_seed_sql(questions)
    
    print("4. Updating 004_update_questions.sql...")
    update_migration_sql(questions)
    
    print("5. Updating src/data/questionsDb.ts...")
    update_ts_db(questions)
    
    print("All tasks completed successfully!")

if __name__ == '__main__':
    main()
