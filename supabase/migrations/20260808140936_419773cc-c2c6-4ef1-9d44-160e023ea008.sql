ALTER TYPE public.material_type ADD VALUE IF NOT EXISTS 'pdf';
ALTER TYPE public.material_type ADD VALUE IF NOT EXISTS 'video';
ALTER TYPE public.material_type ADD VALUE IF NOT EXISTS 'pdf_video';
ALTER TYPE public.material_type ADD VALUE IF NOT EXISTS 'apostila';
ALTER TYPE public.material_type ADD VALUE IF NOT EXISTS 'infografico';
ALTER TYPE public.material_type ADD VALUE IF NOT EXISTS 'atividade';
ALTER TYPE public.material_type ADD VALUE IF NOT EXISTS 'curso';
ALTER TYPE public.material_type ADD VALUE IF NOT EXISTS 'aula';
ALTER TYPE public.material_type ADD VALUE IF NOT EXISTS 'material_externo';
ALTER TYPE public.material_type ADD VALUE IF NOT EXISTS 'prova_anterior';
ALTER TYPE public.material_type ADD VALUE IF NOT EXISTS 'gabarito';
ALTER TYPE public.material_type ADD VALUE IF NOT EXISTS 'livro';

ALTER TYPE public.subject ADD VALUE IF NOT EXISTS 'informatica';

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'kit';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'compra';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'avaliacao';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'simulado';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'recomendacao';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'meta';