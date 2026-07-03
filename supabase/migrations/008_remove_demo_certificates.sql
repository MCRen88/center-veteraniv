-- 008_remove_demo_certificates.sql
-- Видалення демонстраційних сертифікатів з реєстру
DELETE FROM public.registry 
WHERE cert LIKE 'СС 12345678/%';
