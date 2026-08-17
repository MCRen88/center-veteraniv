import json
import re
import sys

def load_pdf_text():
    with open('docs/pdf_kom_extracted.txt', 'r', encoding='utf-8') as f:
        return f.read()

def parse_pdf_sections(pdf_text):
    sections = re.split(r'(Контрольно-оцінювальні матеріали.*?варіант \d+|Комплексне кваліфікаційне \(практичне\) завдання №\d+)', pdf_text)
    sec_map = {}
    for i in range(1, len(sections), 2):
        header = sections[i].strip()
        content = sections[i+1]
        sec_map[header] = content
    return sec_map

def parse_questions_from_section(content):
    lines = [l.strip() for l in content.split('\n') if not re.match(r'^---\s*PAGE\s*\d+\s*---$', l.strip())]
    
    questions = []
    i = 0
    opt_prefix_re = re.compile(r'^[A-Za-zА-Яа-яіЇєІЇЄ0-9][\.\)]\s+')
    
    while i < len(lines):
        line = lines[i]
        m = re.match(r'^(\d+)\.\s+(.*)$', line)
        if m:
            q_num = int(m.group(1))
            q_text = m.group(2)
            i += 1
            # Collect question text until an option prefix
            while i < len(lines) and not opt_prefix_re.match(lines[i]) and not re.match(r'^\d+\.\s+', lines[i]):
                if lines[i] and not lines[i].startswith('Виберіть одну') and not lines[i].startswith('Термін виконання'):
                    q_text += ' ' + lines[i]
                i += 1
            
            # Now collect options
            options = []
            while i < len(lines) and not re.match(r'^\d+\.\s+', lines[i]) and len(options) < 4:
                if opt_prefix_re.match(lines[i]):
                    opt_m = re.match(r'^[A-Za-zА-Яа-яіЇєІЇЄ0-9][\.\)]\s+(.*)$', lines[i])
                    opt_text = opt_m.group(1) if opt_m else lines[i]
                    i += 1
                    while i < len(lines) and not opt_prefix_re.match(lines[i]) and not re.match(r'^\d+\.\s+', lines[i]):
                        if lines[i] and not lines[i].startswith('Виберіть одну') and not lines[i].startswith('Термін виконання'):
                            opt_text += ' ' + lines[i]
                        i += 1
                    options.append(opt_text.strip())
                else:
                    i += 1
            
            questions.append({
                'num': q_num,
                'question': q_text.strip(),
                'options': options
            })
        else:
            i += 1
    return questions

def parse_cases_from_section(content):
    lines = [l.strip() for l in content.split('\n') if not re.match(r'^---\s*PAGE\s*\d+\s*---$', l.strip())]
    cases = []
    i = 0
    opt_prefix_re = re.compile(r'^[1234][\.\)]\s+')
    
    while i < len(lines):
        line = lines[i]
        m = re.match(r'^(\d+|Кейс \d+)\.\s+(.*)$', line)
        if m and ('Опис ситуації' in content[content.find(line):content.find(line)+300] or 'Питання:' in content[content.find(line):content.find(line)+300]):
            c_num_str = m.group(1)
            c_title = m.group(2)
            i += 1
            
            description = ""
            question_text = ""
            options = []
            
            while i < len(lines) and not lines[i].startswith('Опис ситуації:') and not lines[i].startswith('Питання:'):
                if lines[i]:
                    c_title += ' ' + lines[i]
                i += 1
                
            if i < len(lines) and lines[i].startswith('Опис ситуації:'):
                description = lines[i][len('Опис ситуації:'):].strip()
                i += 1
                while i < len(lines) and not lines[i].startswith('Питання:'):
                    if lines[i]:
                        description += ' ' + lines[i]
                    i += 1
                    
            if i < len(lines) and lines[i].startswith('Питання:'):
                question_text = lines[i][len('Питання:'):].strip()
                i += 1
                while i < len(lines) and not opt_prefix_re.match(lines[i]):
                    if lines[i]:
                        question_text += ' ' + lines[i]
                    i += 1
                    
            while i < len(lines) and len(options) < 4:
                if opt_prefix_re.match(lines[i]):
                    opt_m = re.match(r'^[1234][\.\)]\s+(.*)$', lines[i])
                    opt_text = opt_m.group(1) if opt_m else lines[i]
                    i += 1
                    while i < len(lines) and not opt_prefix_re.match(lines[i]) and not re.match(r'^(\d+|Кейс \d+)\.\s+', lines[i]) and not lines[i].startswith('Термін виконання'):
                        if lines[i]:
                            opt_text += ' ' + lines[i]
                        i += 1
                    options.append(opt_text.strip())
                else:
                    i += 1
                    
            cases.append({
                'num_str': c_num_str,
                'title': c_title.strip(),
                'description': description.strip(),
                'question': question_text.strip(),
                'options': options
            })
        else:
            i += 1
    return cases

if __name__ == '__main__':
    pdf_text = load_pdf_text()
    sec_map = parse_pdf_sections(pdf_text)
    
    for k, v in sec_map.items():
        if 'тестові завдання' in k:
            qs = parse_questions_from_section(v)
            print(f"=== {k} ===")
            print(f"Parsed questions count: {len(qs)}")
            for q in qs:
                if len(q['options']) != 4:
                    print(f"  WARNING: Question {q['num']} has {len(q['options'])} options! Text: {q['question'][:50]}")
        else:
            cs = parse_cases_from_section(v)
            print(f"=== {k} ===")
            print(f"Parsed cases count: {len(cs)}")
            for c in cs:
                if len(c['options']) != 4:
                    print(f"  WARNING: Case {c['num_str']} has {len(c['options'])} options! Title: {c['title'][:50]}")
