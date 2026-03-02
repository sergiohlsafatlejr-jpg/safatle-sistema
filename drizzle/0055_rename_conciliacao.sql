-- Renomear tabelas de conciliação (já executado via SQL direto)
-- Esta migração é apenas para manter o histórico consistente
-- As tabelas conciliacaoTasy e resumoConciliacaoTasy já foram renomeadas para conciliacao e resumoConciliacao
-- via RENAME TABLE no banco de dados

-- Nota: Se as tabelas antigas ainda existirem, descomente as linhas abaixo:
-- RENAME TABLE `conciliacaoTasy` TO `conciliacao`;
-- RENAME TABLE `resumoConciliacaoTasy` TO `resumoConciliacao`;
