# Issue #4: Métricas Customizadas nas Fichas

## Objetivo
Permitir ao Mestre adicionar barras de recursos adicionais personalizadas nas Fichas de Personagem/Criatura (ex: Mana, Energia, Sanidade, Pontos de Ki) com seletores numéricos e barras de progresso independentes do PV padrão.

## Alterações de Estrutura (TypeScript)
* Expandir a interface da Ficha no arquivo `types.ts` para incluir a propriedade opcional de métricas dinâmicas:
  ```typescript
  customMetrics?: {
    id: string;
    name: string;
    current: number;
    max: number;
    color: string; // Código Hex ou classe de cor para a barra
  }[];