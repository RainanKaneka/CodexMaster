/**
 * geradoresData.ts — Dicionários de Geração Procedural
 *
 * Arquivo de dados isolado da lógica de UI e de engine.
 * Cada categoria segue o contrato do ProceduralEngine:
 *   - `templates`: array de strings com {tags} embutidas
 *   - Qualquer outra chave é uma lista de substituições para a {tag} correspondente
 *
 * Toda alteração de conteúdo deve acontecer aqui, nunca no componente.
 */

export type GeneratorCategory = Record<string, string[]>;
export type GeradoresDataMap = Record<string, GeneratorCategory>;

const geradoresData: GeradoresDataMap = {

  // ---------------------------------------------------------------------------
  // TAVERNAS — Nomes procedurais compostos via template recursivo
  // ---------------------------------------------------------------------------
  tavern: {
    templates: [
      'A {noun} {adjective}',
      'O Descanso do {profession}',
      'Taverna {adjective} do {name}',
      '{noun} e {noun}',
      'O {noun} {adjective}',
      'A {noun} do {profession}',
      'Estalagem {adjective}',
      'O Refúgio do {name}',
    ],
    noun: [
      'Caneca', 'Espada', 'Coroa', 'Sereia', 'Dragão', 'Moeda',
      'Lanterna', 'Âncora', 'Lobo', 'Corvo', 'Chama', 'Punhal',
      'Taça', 'Martelo', 'Escudo', 'Osso', 'Cogumelo', 'Tocha',
      'Aranha', 'Crânio', 'Lira', 'Tridente',
    ],
    adjective: [
      'Enferrujada', 'Reluzente', 'Quebrada', 'Sorridente', 'Cega',
      'Dourada', 'Negra', 'Prateada', 'Flamejante', 'Sombria',
      'Perdida', 'Amaldiçoada', 'Encantada', 'Adormecida', 'Faminta',
      'Errante', 'Sangrenta', 'Ancestral', 'Silenciosa', 'Sinistra',
      'Gloriosa', 'Esquecida',
    ],
    profession: [
      'Aventureiro', 'Rei', 'Ferreiro', 'Bardo', 'Mago', 'Lobo',
      'Paladino', 'Caçador', 'Mercador', 'Explorador', 'Druida',
      'Ladrão', 'Oráculo', 'Gigante', 'Guerreiro', 'Assassino',
      'Alquimista', 'Navegante', 'Ermitão', 'Herói Caído',
    ],
    name: [
      'Gimli', 'Arthur', 'Merlin', 'Grim', 'Balin', 'Vorga',
      'Edric', 'Morrigan', 'Theron', 'Isolde', 'Aldric', 'Sable',
      'Corvus', 'Lyra', 'Oryn', 'Dusk', 'Vael', 'Wren',
    ],
  },

  // ---------------------------------------------------------------------------
  // NPC PROCEDURAL — Personagem com nome + traço de caráter
  // ---------------------------------------------------------------------------
  npc: {
    templates: [
      '{firstName} {surname}, o {profession} {trait}',
      '{firstName} {surname} — {trait} e {trait}',
      '{firstName}, o {profession} de {place}',
    ],
    firstName: [
      'Kael', 'Elara', 'Thorin', 'Lyra', 'Mira', 'Draven',
      'Seraphina', 'Orin', 'Cassian', 'Vex', 'Isolde', 'Ronin',
      'Aelindra', 'Corvus', 'Sable', 'Theron', 'Wren', 'Varek',
      'Zorath', 'Elden', 'Nira', 'Brennan',
    ],
    surname: [
      'Pedrabranca', 'Olhonegro', 'Mateiros', 'Corvoesquivo',
      'Sombrasela', 'Lâmina Fria', 'Cinzaverde', 'Pedra de Osso',
      'Caçador da Lua', 'Veneno Sutil', 'Voz do Abismo',
      'Passo Leve', 'Brasa Fria', 'Olho de Serpente',
      'Filho do Vácuo', 'Mão de Ferro', 'Vento Cortante',
      'Toque da Morte', 'Coração Vazio',
    ],
    profession: [
      'Guarda', 'Ladrão', 'Nobre', 'Mercador', 'Assassino',
      'Curandeiro', 'Espiã', 'Bardo', 'Caçador de Recompensas',
      'Necromante Arrependido', 'Paladino Exilado', 'Druida Renegado',
      'Capitão de Navio', 'Arcanista', 'Ferreiro Amaldiçoado',
    ],
    trait: [
      'Misterioso', 'Zangado', 'Alegre', 'Desconfiado', 'Leal',
      'Covarde', 'Ambicioso', 'Paranoico', 'Cansado de Lutar',
      'Obcecado com Ouro', 'Assombrado pelo Passado', 'Sedento de Vingança',
      'Fiel ao Ossuário de Ouroboros', 'Último de Seu Clã',
      'Portador de um Segredo Mortal', 'Amaldiçoado pelo Antigo Rei',
    ],
    place: [
      'Valdurath', 'Eryndor', 'As Planícies Cinzentas', 'Porto Sombrio',
      'O Ossuário de Ouroboros', 'A Floresta Sem Nome', 'Borda do Abismo',
      'As Ruínas de Malgrath',
    ],
  },

  // ---------------------------------------------------------------------------
  // NOMES DE PNJ — Simples, mas com amplo vocabulário
  // ---------------------------------------------------------------------------
  npcNames: {
    templates: [
      '{firstName} {surname}',
    ],
    firstName: [
      'Aldric', 'Branwen', 'Caelan', 'Dorian', 'Edric', 'Faolan',
      'Gareth', 'Hadwin', 'Ivar', 'Jorik', 'Kelan', 'Lorcan',
      'Maddox', 'Niall', 'Oswin', 'Peregrin', 'Quillan', 'Roran',
      'Seamus', 'Torin', 'Ulric', 'Vance', 'Wulfric', 'Xander',
      'Yorick', 'Zephyr', 'Aelindra', 'Briar', 'Cressida', 'Dwyn',
      'Elspeth', 'Fiona', 'Gwyneth', 'Hilde', 'Isadora', 'Jessa',
      'Kira', 'Morrigan', 'Nessa', 'Orla', 'Saoirse', 'Taika',
    ],
    surname: [
      'Pedrabranca', 'Olhonegro', 'Mateiros', 'Ferreiro', 'Corvoesquivo',
      'Monteluz', 'Reivindor', 'Dumasvar', 'Vilanova', 'Capabela',
      'Sonhador', 'Escudeiro', 'Ossoroto', 'Veirdos', 'Sombrasela',
      'Cinzas da Guerra', 'Fio de Aço', 'Irmão da Noite',
      'Espinho de Ferro', 'Lágrima de Pedra', 'Dente de Lobo',
      'Filho do Caos', 'Marca do Vazio', 'Portador de Runas',
    ],
  },

  // ---------------------------------------------------------------------------
  // BOATOS DE TAVERNA — Lista simples via {rumor}
  // ---------------------------------------------------------------------------
  rumors: {
    templates: ['{rumor}'],
    rumor: [
      'Dizem que um mercador foi encontrado morto na estrada, sem qualquer ferimento visível.',
      'Uma bruxa vive no pântano a leste. Ela troca feitiços por segredos que ninguém deveria saber.',
      'A mina abandonada no norte ainda tem ouro — mas algo vivo e faminto habita suas galerias.',
      'O prefeito da cidade foi visto saindo do cemitério ao amanhecer, com as mãos cobertas de terra.',
      'Cavaleiros sem brasão foram avistados rondando a vila há três dias. Nenhum fala com ninguém.',
      'A hospedaria da estrada tem um porão que ninguém menciona — e de onde nunca sai cheiro de comida.',
      'Dizem que um espírito assombra a ponte velha às noites de lua cheia. Quem o vê, não dorme mais.',
      'Houve uma guerra dentro da guilda dos ladrões. Metade deles está morta. A outra metade, desaparecida.',
      'Um nobre da capital está pagando fortunas por fragmentos de osso do Ossuário de Ouroboros.',
      'Crianças desaparecem ao brincar perto da Floresta Sem Nome. Três só nesta semana.',
      'Um barco chegou ao porto sem tripulação. Havia marcas de garras no convés e um altar improvisado no porão.',
      'O curandeiro local compra ervas negras e raízes de cadáver. Segundo ele, são "para fins medicinais".',
      'Um monge afirma ter visto a Montanha do Oráculo brilhar com luz verde na noite passada.',
      'A fazenda dos Aldric pegou fogo. Eles juram que a chama era azul — e que algo saiu andando das brasas.',
      'Um mensageiro real foi interceptado. A carta nunca chegou — mas alguém a entregou com conteúdo diferente.',
      'Dizem que o antigo rei não morreu. Que ele dorme sob a cidade, esperando ser despertado.',
      'O último sobrevivente da Batalha de Valdurath entrou na taverna, bebeu seis canecas, e sussurrou: "Eles vêm de baixo."',
      'Um caçador voltou da floresta com os olhos brancos. Ele não fala mais. Apenas sorri.',
      'O ferreiro da vila está fundindo metal que não existe em nenhum livro. O cheiro do forno é de osso queimado.',
      'Alguém está reacendendo as Fogueiras dos Banidos em toda a região. Não se sabe quem. Não se sabe por quê.',
      'Um viajante pagou a conta com moedas de um reino que foi destruído há duzentos anos.',
      'O poço do mercado tem mostrado rostos na água. Nenhum deles é de alguém vivo na cidade.',
    ],
  },

  // ---------------------------------------------------------------------------
  // CLIMA E TEMPO — Lista simples via {condition}
  // ---------------------------------------------------------------------------
  weather: {
    templates: ['{condition}'],
    condition: [
      'Céu claro, vento suave do norte. Uma manhã perfeita para viajar — e para ser seguido sem perceber.',
      'Neblina densa até o meio-dia. Visibilidade de poucos metros. Sons distorcidos pela névoa.',
      'Chuva leve e constante. O chão está enlameado. Pegadas aparecem — e somem sozinhas.',
      'Tempestade elétrica iminente. Trovões ao longe, relâmpagos cor de âmbar. O gado está inquieto.',
      'Frio cortante com geada ao amanhecer. Armaduras de metal queimam como ferro quente.',
      'Dia abafado e quente. Animais cansam mais rápido. A água dos rios está morna e suja.',
      'Vento forte do leste. Traz consigo areia cinza e cheiro de enxofre distante.',
      'Chuva intensa que começa subitamente. Córregos transbordam. Pontes ficam instáveis.',
      'Neve leve e silenciosa. Pegadas na estrada somem em minutos. Tudo parece adormecido.',
      'Nuvens pesadas sem chuva. Opressivas. Uma tensão no ar que faz os cavalos relinchar.',
      'Granizo repentino por dez minutos. Machuca quem está descoberto. Deixa o solo branco e silencioso.',
      'Vento uivante à noite. Janelas batem. Lanternas apagam. Sombras se movem no lugar errado.',
      'Nevasca fechada. Zero visibilidade. Orientação impossível sem guia ou magia.',
      'Calor seco e rachante. A terra abre fissuras. Criaturas das profundezas se aproximam da superfície.',
      'Chuva de cinzas leve, procedente de uma direção desconhecida. Não são cinzas de madeira.',
      'Céu de cor cobre ao entardecer. Os pássaros voam em círculos. Nenhum pousa.',
      'Aurora boreal visível mesmo durante o dia — fenômeno inexplicável e perturbador.',
      'Silêncio absoluto. Nenhum vento, nenhum pássaro, nenhum inseto. Apenas o som dos passos.',
      'Trovoada sem chuva. Relâmpagos que iluminam silhuetas no horizonte que não deveriam estar lá.',
      'Orvalho pesado e frio ao amanhecer. As folhas estão negras. Não é doença — é alguma outra coisa.',
    ],
  },

  // ---------------------------------------------------------------------------
  // MERCADOR ALEATÓRIO — Lista simples via {item}
  // ---------------------------------------------------------------------------
  shopInventory: {
    templates: ['{item}'],
    item: [
      'Espada enferrujada de um cavaleiro morto há trinta anos. A bainha tem inscrições apagadas.',
      'Mapa de uma região que o vendedor não sabe nomear — e que não aparece em nenhum atlas.',
      'Três frascos de líquido verde-escuro sem rótulo. O vendedor garante que "faz bem para a tosse".',
      'Um livro de receitas escritas em um idioma que ninguém identifica, com ilustrações perturbadoras.',
      'Estatueta de um deus obscuro esculpida em osso humano — pelo menos, parece humano.',
      'Âmbar com uma criatura pequena fossilizada dentro. A criatura parece estar sorrindo.',
      'Um par de luvas de couro que nunca esfria — mesmo perto de brasas.',
      'Lanterna com chama azul que nunca se apaga com o vento. Queima sem combustível.',
      'Saco de sementes pretas que o vendedor afirma serem "de um jardim muito especial, embaixo da cidade".',
      'Botas que fazem sons de casco de cavalo ao caminhar. O vendedor as chama de "disfarce de emergência".',
      'Espelho pequeno que reflete a imagem levemente atrasada — dois ou três segundos.',
      'Capa com bolso interno que parece maior por dentro do que por fora. O vendedor não sabe o que está lá dentro.',
      'Fragmento de osso branco que pulsa levemente sob luz de lua. Vem do Ossuário de Ouroboros, diz o mercador.',
      'Anel de ferro com uma runa que muda de forma dependendo de quem o segura.',
      'Pena de corvo gigante — maior do que qualquer corvo visto em vida. Perfeitamente preta, sem brilho.',
      'Uma chave enferrujada com um bilhete: "Abre a terceira porta após a última luz."',
      'Tônica "da memória esquecida" — o vendedor não se lembra de onde comprou.',
      'Crânio de criatura desconhecida, pintado de vermelho, com runas entalhadas por dentro.',
      'Manto de tecido negro que não molha — nem com chuva, nem com sangue.',
      'Bússola que não aponta para o Norte. Aponta para algo. O vendedor diz que "é melhor não seguir".',
      'Sino de bronze que, segundo o vendedor, repele espíritos. Não toca quando sacudido.',
      'Pergaminho selado com cera negra e emblema de um reino extinto. O vendedor não sabe o conteúdo.',
    ],
  },

  // ---------------------------------------------------------------------------
  // GANCHOS DE CENA — Lista simples via {hook}
  // ---------------------------------------------------------------------------
  encounterHooks: {
    templates: ['{hook}'],
    hook: [
      'Um ferido cai de cavalo na frente do grupo, pedindo ajuda. Seus ferimentos não são de lâmina.',
      'Uma criança está sozinha no meio da estrada segurando uma chave de ferro enferrujada.',
      'Um bando de bandidos discute entre si — claramente divididos sobre se devem atacar ou fugir.',
      'Um rastro de sangue negro leva para dentro da floresta. Não é sangue humano.',
      'Um velho sentado sozinho faz uma pergunta curiosamente específica: "Você já esteve no Ossuário?"',
      'Um sinal recente de aventureiros mortos na beira da estrada — sem marcas de luta, sem pertences.',
      'Alguém está sendo leiloado em cima de um caixote na praça. Ele não parece angustiado. Parece aliviado.',
      'Uma carta abandonada endereçada a um dos personagens — com informação que eles nunca compartilharam.',
      'Um animal amestrado entrega algo ao grupo — uma bolsa de moedas e um pedaço de pergaminho queimado.',
      'Uma multidão se forma ao redor de um curandeiro que faz milagres. Os curados depois somem.',
      'Um mensageiro paralisa ao ver o grupo, depois foge deixando a bolsa cair.',
      'Um monge ferido rasteja pela estrada repetindo as mesmas palavras em loop: "Não abram o terceiro selo."',
      'Uma porta arrombada, sons de luta abafados. Quando entram: nada. Apenas móveis arranjados em círculo.',
      'Uma criança entrega ao grupo uma boneca esculpida à mão — que tem a face de um dos personagens.',
      'Um cadáver sentado em posição de meditação no meio de uma clareira. Com um sorriso. Ainda quente.',
      'Fumaça no horizonte — não da direção de nenhuma cidade conhecida.',
      'Um grupo de soldados passa em marcha forçada sem olhar para ninguém. Todos com os olhos cobertos de vendas.',
      'Um sino distante toca três vezes — e todos os pássaros da região levantam voo ao mesmo tempo.',
      'Um comerciante oferece informações sobre a região em troca de "qualquer coisa que você não vá precisar mais".',
      'As pegadas na trilha começam normais e, gradualmente, ficam mais fundas — como se quem caminhava ficasse mais pesado.',
      'Um espantalho no meio de um campo está usando armadura real. De um nobre desaparecido.',
      'Uma criança aponta para uma árvore e pergunta: "Aquele homem está bem?" Não há ninguém na árvore.',
    ],
  },

  // ---------------------------------------------------------------------------
  // EXEMPLO RECURSIVO — Mantido para testes unitários
  // ---------------------------------------------------------------------------
  recursive_example: {
    templates: ['O {animal_phrase} dorme.'],
    animal_phrase: ['pequeno {animal}', 'grande {animal}'],
    animal: ['gato', 'cão', 'urso'],
  },
};

export default geradoresData;
