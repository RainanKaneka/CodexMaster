# Issue #13: Atributos Voláteis e Métricas no Combate

## Objetivo
Permitir a edição rápida de Atributos Voláteis (conforme definido no escopo original do projeto) e integrar as Métricas Customizadas (Mana, Ki, etc.) diretamente nos cards do Tracker de Combate, facilitando a gestão de recursos sem precisar abrir a ficha completa.

## Alterações de Interface e Lógica (React)
1. **Atributos Voláteis (Base):**
   * Implementar a edição rápida dos atributos temporários no card de combate (ex: CA bônus, deslocamento reduzido, etc., conforme a ideia original do projeto).
2. **Métricas Customizadas no Combate (Nova Adição):**
   * No `CombatView`, cada card de personagem/criatura deve ler o array `customMetrics` da sua ficha original no banco de dados.
   * Renderizar essas métricas (ex: Mana, Pontos de Dragão) logo abaixo da barra de HP/PV Temporário do card.
   * **Visual:** Manter as cores definidas na ficha (ex: barra azul para Mana, vermelha para Pontos de Dragão). O design deve ser minimalista para não poluir o card.
   * **Controles:** Adicionar pequenos botões de `+` e `-` (ou um input numérico rápido) ao lado de cada barra de métrica para gastar ou recuperar esses pontos durante o turno.
3. **Sincronização de Dados (Auto-Save):**
   * Qualquer alteração nessas métricas ou atributos voláteis feita no Tracker de Combate deve atualizar imediatamente a ficha base correspondente através do `DatabaseContext`.