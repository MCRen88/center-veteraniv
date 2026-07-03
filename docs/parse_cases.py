import re
import json
import os

def clean_text(text):
    text = text.strip()
    # Normalize multiple spaces, tabs, newlines
    text = re.sub(r'\s+', ' ', text)
    return text

def clean_option(opt):
    opt = opt.strip()
    # Remove leading number prefixes like "1. ", "2. "
    opt = re.sub(r'^\d+\.\s*', '', opt)
    # Remove leading letter prefixes like "А) ", "Б) ", "А) ", "Б) " (using Cyrillic and Latin chars)
    opt = re.sub(r'^[А-Яа-яA-Za-z]\)\s*', '', opt)
    return clean_text(opt)

def main():
    # 1. Read existing explanations from casesDb.ts
    cases_db_path = 'src/data/casesDb.ts'
    explanations = []
    
    if os.path.exists(cases_db_path):
        with open(cases_db_path, 'r', encoding='utf-8') as f:
            cases_db_content = f.read()
        # Find all occurrences of "explanation": "..."
        # Using regex to find explanation values
        matches = re.findall(r'"explanation":\s*"([^"]+)"', cases_db_content)
        if matches:
            explanations = matches
            print(f"Extracted {len(explanations)} explanations from existing casesDb.ts")
        else:
            print("Warning: Could not extract explanations using double quote regex, trying single quotes/multiline...")
            matches = re.findall(r'"explanation":\s*`([^`]+)`', cases_db_content)
            if matches:
                explanations = matches
                print(f"Extracted {len(explanations)} explanations")
    
    # Standard explanations fallback if none found
    if len(explanations) < 10:
        explanations = [
            "Поєднання безкомпромісного дотримання Закону «Про захист персональних даних» з активним вирішенням проблеми (клієнтоорієнтованість). Пропонує легальні шляхи вирішення ситуації через адміністрацію медичного закладу та допомагає знизити рівень агресії відвідувача через виявлення емпатії.",
            "Це класичний протокол першої психологічної допомоги (ППД). Техніка «заземлення» повертає людини з флешбеку або панічної атаки в реальність. Фізичний контакт (обійми) без дозволу може сприйматися як загроза і посилити реакцію.",
            "Пільги на проїзд для осіб з інвалідністю внаслідок війни надаються без обмеження кількості місць на рейс. Конструктивний шлях — це правове вирішення через органи регулювання та контролю (Укртрансбезпеку та органи самоврядування).",
            "Підпис документів іншою особою є підробкою документів, що є протизаконним. Правильний варіант поєднує юридичну чистоту, психологічную підтримку та залучення суміжних спеціалістів (психологів) для стабілізації стану клієнтки.",
            "Ефективна адаптація базується на збереженні професійної ідентичності особи. Ветеран має великий багаж знань про будову авто, тому використання його досвіду на посадах координаційного або консультаційного характеру в тій самій сфері полегшить адаптацію.",
            "Мета супроводу — розширення спроможності ветерана (empowerment) та відновлення його самостійності, а не виконання роботи за нього. Фахівець виступає навігатором: направляє на навчання, координує з експертами та допомагає розібратися.",
            "Моніторинг спрямований на оцінку відповідності плану поточному стану клієнта. Відмова від плану часто свідчить про психологічну кризу. План має бути гнучким: спочатку стабілізація психологічного стану, а вже потім — працевлаштування.",
            "Етичні стандарти вимагають уникати конфлікту інтересів. Найкраще рішення — допомогти другу оформити документи якісно, але передати ведення його кейсу іншому фахівцю, щоб зняти будь-які підозри в упередженості.",
            "Хронічна втома, втрата емпатії та цинізм є класичними ознаками синдрому емоційного вигорання (СЕВ). Професійний шлях вирішення — супервізія, плановий відпочинок та навчання навичкам саморегуляції.",
            "Безпека постраждалих від домашнього насильства є абсолютним пріоритетом. Особисте перевиховування агресора є небезпечним. Фахівець повинен надати дружині інструменти захисту, контакти кризових служб та психологічну підтримку."
        ]
        print("Using fallback explanations list.")

    # 2. Read and parse docs/Кейси_оновлені.txt
    txt_path = 'docs/Кейси_оновлені.txt'
    with open(txt_path, 'r', encoding='utf-8') as f:
        text = f.read()

    # Define titles to slice the text
    titles = [
        "1. Захист персональних даних та робота з агресивним клієнтом",
        "2. Перша психологічна допомога при гострій реакції на стрес",
        "3. Захист прав ветеранів на міжміські перевезення",
        "4. Робота з кризовими сімʼями та етичні дилеми підпису документів",
        "Кейс 5. Карʼєрна адаптація ветеранів з інвалідністю",
        "Кейс 6. Консультування щодо ветеранського бізнесу та межі повноважень",
        "7. Коригування індивідуального плану супроводу",
        "8. Запобігання конфлікту інтересів та кумівству",
        "9. Профілактика професійного вигорання та саморегуляція",
        "10. Домашнє насильство та робота з родиною ветерана"
    ]

    # Find the positions of each title
    positions = []
    for title in titles:
        pos = text.find(title)
        if pos == -1:
            print(f"Error: Could not find title '{title}' in text.")
            return
        positions.append(pos)
    
    # Also find position of "Відповіді:"
    ans_pos = text.find("Відповіді:")
    if ans_pos == -1:
        print("Error: Could not find 'Відповіді:' in text.")
        return
    positions.append(ans_pos)

    # Extract cases blocks
    case_blocks = []
    for i in range(10):
        block = text[positions[i]:positions[i+1]].strip()
        case_blocks.append(block)

    # Parse answers
    answers_text = text[ans_pos:].strip()
    answers_map = {}
    for match in re.finditer(r'(\d+)\s*-\s*(\d+)', answers_text):
        case_num = int(match.group(1))
        ans_num = int(match.group(2))
        answers_map[case_num] = ans_num - 1 # Convert to 0-indexed
        
    print(f"Parsed answers map: {answers_map}")

    # Process each case block
    cases = []
    for idx, block in enumerate(case_blocks):
        case_id = idx + 1
        lines = [line.strip() for line in block.split('\n') if line.strip()]
        
        # The first line is the title of the case (since we sliced by title)
        # Note: for case 1, block might contain the "Комплексне кваліфікаційне..." header at the start depending on slicing,
        # but positions[0] starts exactly at the title because we used text.find("1. Захист...")
        title = lines[0]
        # In case title starts with case id prefix, we format it nicely
        # The document contains headers like "Кейс 5. ...", "7. ...", "1. ..."
        # Let's clean the title name if needed, or keep it exactly as in the docx.
        # Let's make it consistent: "Кейс X. Title"
        # We can clean it by removing any "Кейс X. " or "X. " and then prepending "Кейс X. "
        title_clean = re.sub(r'^(Кейс\s+)?\d+\.\s*', '', title).strip()
        final_title = f"Кейс {case_id}. {title_clean}"

        situation = ""
        question = ""
        options = []
        
        # State: 0 = searching situation, 1 = situation, 2 = question, 3 = options
        state = 0
        
        for line in lines[1:]:
            if line.startswith("Опис ситуації:") or line.startswith("Ситуація:"):
                situation = re.sub(r'^(Опис ситуації|Ситуація):\s*', '', line).strip()
                state = 1
            elif line.startswith("Питання:") or line.startswith("Запитання:"):
                question = re.sub(r'^(Питання|Запитання):\s*', '', line).strip()
                state = 2
            else:
                if state == 1:
                    situation += " " + line
                elif state == 2:
                    # In some cases the question might have wrapped, or options started without prefix.
                    # Since questions are single sentences, if we hit an option we add it, otherwise append to question.
                    # Usually, any line after state == 2 is an option
                    options.append(clean_option(line))
                    state = 3
                elif state == 3:
                    options.append(clean_option(line))

        situation = clean_text(situation)
        question = clean_text(question)
        
        correct_answer = answers_map.get(case_id, 0)
        explanation = explanations[idx]

        cases.append({
            "id": case_id,
            "title": final_title,
            "situation": situation,
            "question": question,
            "options": options,
            "correctAnswer": correct_answer,
            "explanation": explanation
        })

    # Print summary to verify
    for c in cases:
        print(f"Case {c['id']}: {c['title']}")
        print(f"  Situation: {c['situation'][:60]}...")
        print(f"  Question: {c['question']}")
        print(f"  Options ({len(c['options'])}):")
        for idx, opt in enumerate(c['options']):
            prefix = "[CORRECT] " if idx == c['correctAnswer'] else "          "
            print(f"    {prefix}{opt[:50]}...")
        print(f"  Explanation: {c['explanation'][:60]}...")
        print()

    # 3. Generate casesDb.ts
    ts_header = """export interface CaseQuestion {
  id: number;
  title: string;
  situation: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export const casesDb: CaseQuestion[] = [
"""
    
    ts_rows = []
    for c in cases:
        row_str = json.dumps(c, indent=2, ensure_ascii=False)
        # Indent the block by 2 spaces
        indented_row = "\n".join("  " + line for line in row_str.split("\n"))
        ts_rows.append(indented_row)
        
    ts_content = ts_header + ",\n".join(ts_rows) + "\n];\n"
    
    with open(cases_db_path, 'w', encoding='utf-8') as f:
        f.write(ts_content)
    print(f"Updated {cases_db_path} successfully!")

    # 4. Generate 007_update_cases.sql
    sql_path = 'supabase/migrations/007_update_cases.sql'
    sql_header = f"""-- Database Migration: Update cases to the latest bank ({len(cases)} cases)
-- Generated automatically from docs/Кейси_оновлені.docx

-- Clear existing cases and restart autoincrement ID sequence
TRUNCATE TABLE public.cases RESTART IDENTITY CASCADE;

-- Insert all {len(cases)} cases
INSERT INTO public.cases (title, situation, question, options, correct_answer, explanation) VALUES
"""
    
    sql_rows = []
    for c in cases:
        title = c['title'].replace("'", "''")
        situation = c['situation'].replace("'", "''")
        question = c['question'].replace("'", "''")
        options_json = json.dumps(c['options'], ensure_ascii=False).replace("'", "''")
        correct_answer = c['correctAnswer']
        explanation = c['explanation'].replace("'", "''")
        
        row = f"('{title}', '{situation}', '{question}', '{options_json}'::jsonb, {correct_answer}, '{explanation}')"
        sql_rows.append(row)
        
    sql_content = sql_header + ",\n".join(sql_rows) + ";\n"
    
    with open(sql_path, 'w', encoding='utf-8') as f:
        f.write(sql_content)
    print(f"Generated migration {sql_path} successfully!")

if __name__ == '__main__':
    main()
