# Issue #8: Vínculo de Entidades Territoriais (Mapas)

## Objetivo
Conectar o Módulo de Mapas ao Módulo de Fichas. Ao clicar em um Pin, o Mestre pode vincular NPCs/Criaturas. Os habitantes devem aparecer na Sidebar com mini-avatars (preparação para fotos reais no futuro).

## Alterações de Estrutura (TypeScript)
* `types.ts` -> Pin: `linkedEntities?: string[];` (Array de IDs de Characters)

## Alterações de Interface (React)
1. **Sidebar de Mapas:**
   * Seção "Habitantes da Região".
   * Seletor de busca de fichas existentes.
   * Lista de Habitantes: Cada item deve ter um **Mini-Avatar Redondo**. 
   * Lógica do Avatar: Por enquanto, deve exibir um círculo colorido com a **inicial do nome**. O componente deve ser isolado (ex: `<CharacterAvatar />`) para facilitar a troca por imagens reais futuramente.
2. **UX Híbrida (Modal + Navegação):**
   * Clique no Avatar -> Abre Modal flutuante com resumo da ficha.
   * Botão no Modal "Ir para Ficha Completa" -> Fecha o modal e altera a aba ativa para 'Fichas', carregando o personagem selecionado.