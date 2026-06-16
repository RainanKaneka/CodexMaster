import { parseEntityMentions } from '../utils/EntityParser';

interface ParsedTextProps {
  text: string;
}

/**
 * Componente que renderiza um texto livre fatiando e estilizando
 * menções a entidades (ex: [[Nome]]) como links interativos.
 */
export function ParsedText({ text }: ParsedTextProps) {
  const tokens = parseEntityMentions(text);

  return (
    <>
      {tokens.map((token, index) => {
        if (token.type === 'text') {
          return <span key={index}>{token.content}</span>;
        }

        // Se for uma entidade, renderiza como link interativo estilo Wiki
        if (token.type === 'entity') {
          return (
            <span
              key={index}
              className="text-gold-primary font-semibold cursor-pointer hover:underline hover:brightness-125 transition-all"
              title={`Ver detalhes de: ${token.content}`}
              onClick={() => {
                // Oportunidade futura para integração com LoreEncyclopediaView
                console.log(`Navegar para entidade: ${token.content}`);
              }}
            >
              {token.content}
            </span>
          );
        }

        return null;
      })}
    </>
  );
}
