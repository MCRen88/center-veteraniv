import os

def generate():
    seed_path = '../supabase/migrations/003_seed.sql'
    mig_path = '../supabase/migrations/004_update_questions.sql'
    
    with open(seed_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Find where the INSERT statement starts
    insert_idx = content.find("INSERT INTO public.questions")
    if insert_idx == -1:
        print("Error: Could not find INSERT statement in seed file.")
        return
        
    insert_sql = content[insert_idx:].strip()
    
    mig_content = f"""-- Database Migration: Update test questions to the latest bank (71 questions)
-- Generated automatically from docs/Тестові питання.docx / 003_seed.sql

-- Clear existing questions and restart autoincrement ID sequence
TRUNCATE public.questions RESTART IDENTITY;

-- Insert all 71 questions
{insert_sql}
"""
    
    with open(mig_path, 'w', encoding='utf-8') as f:
        f.write(mig_content)
    print(f"Successfully generated migration file: {os.path.basename(mig_path)}")

if __name__ == '__main__':
    generate()
