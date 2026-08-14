import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { VaultInfo, AppConfig } from './types';

// =============================================================================
// VAULT MANAGER — Gerenciador de Cofres / Campanhas (v2.0.0)
//
// Módulo isolado responsável por:
//   - Persistência do registro global de cofres em app-config.json
//   - Criação de pastas e bancos de dados individuais por campanha
//   - Resolução do cofre ativo (última campanha aberta)
//
// Regra direcao.md (SoC): Este módulo NÃO manipula dados de jogo — ele apenas
// gerencia a estrutura de pastas e o registro de cofres. A leitura/escrita do
// db.json de cada cofre continua sendo responsabilidade do main.ts.
// =============================================================================

// =============================================================================
// Caminhos e Configuração
// =============================================================================

/**
 * Retorna o caminho absoluto do arquivo de configuração global do app.
 * Localização: {userData}/app-config.json (AppData no Windows).
 */
function getConfigPath(): string {
  return path.join(app.getPath('userData'), 'app-config.json');
}

/**
 * Retorna o diretório padrão onde os cofres (campanhas) são armazenados.
 * Localização: {Documents}/CodexMaster/Vaults/
 * Cria o diretório automaticamente se não existir.
 */
export function getDefaultVaultsDir(): string {
  const dir = path.join(app.getPath('documents'), 'CodexMaster', 'Vaults');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// =============================================================================
// Leitura e Escrita do app-config.json
// =============================================================================

/**
 * Lê o arquivo de configuração global.
 * Se o arquivo não existir ou estiver corrompido, retorna um objeto padrão vazio.
 */
function readConfig(): AppConfig {
  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(raw) as AppConfig;
    }
  } catch (err) {
    console.error('[VaultManager] Erro ao ler app-config.json:', err);
  }
  return { vaults: [], lastActiveVaultId: null };
}

/**
 * Escrita atômica do arquivo de configuração global.
 * Grava em arquivo .tmp e renomeia para evitar corrupção em caso de crash.
 * (Mesmo padrão utilizado pelo writeDatabase no main.ts)
 */
function writeConfig(config: AppConfig): void {
  const configPath = getConfigPath();
  const tmpPath = configPath + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(config, null, 2), 'utf-8');
  fs.renameSync(tmpPath, configPath);
}

// =============================================================================
// Sanitização de Nome de Pasta
// =============================================================================

/**
 * Sanitiza um nome de campanha para uso seguro como nome de pasta no Windows.
 * Remove caracteres proibidos (\ / : * ? " < > |) e faz trim de espaços.
 * Se o nome ficar vazio após sanitização, usa 'Nova Campanha' como fallback.
 */
function sanitizeFolderName(name: string): string {
  let sanitized = name.replace(/[\\/:*?"<>|]/g, '').trim();
  if (!sanitized) {
    sanitized = 'Nova Campanha';
  }
  return sanitized;
}

/**
 * Garante que o caminho da pasta seja único.
 * Se a pasta já existir, adiciona um sufixo numérico (ex: 'Campanha (2)').
 */
function ensureUniquePath(basePath: string): string {
  if (!fs.existsSync(basePath)) {
    return basePath;
  }

  let counter = 2;
  let candidate: string;
  do {
    candidate = `${basePath} (${counter})`;
    counter++;
  } while (fs.existsSync(candidate));

  return candidate;
}

// =============================================================================
// Operações CRUD de Cofres
// =============================================================================

/**
 * Retorna a lista de todos os cofres registrados no app-config.json.
 */
export function getAllVaults(): VaultInfo[] {
  const config = readConfig();
  return config.vaults;
}

/**
 * Cria um novo cofre (campanha) com o nome informado.
 *
 * Processo:
 * 1. Sanitiza o nome para uso como pasta no SO
 * 2. Cria a subpasta no diretório padrão de Vaults
 * 3. Cria o db.json inicial (esqueleto vazio) e a pasta media/
 * 4. Registra o cofre no app-config.json
 *
 * @param name — Nome de exibição da campanha
 * @returns O objeto VaultInfo do cofre recém-criado
 */
export function createVault(name: string): VaultInfo {
  const id = crypto.randomUUID();
  const sanitizedName = sanitizeFolderName(name);
  const basePath = path.join(getDefaultVaultsDir(), sanitizedName);
  const vaultPath = ensureUniquePath(basePath);

  // Cria a estrutura de pastas do cofre
  fs.mkdirSync(vaultPath, { recursive: true });
  fs.mkdirSync(path.join(vaultPath, 'media'), { recursive: true });

  // Esqueleto inicial do banco de dados — mesma estrutura esperada pelo DatabaseContext
  const initialDb = {
    sheets: [],
    maps: [],
    campaignNotes: '',
    spells: [],
    items: [],
    abilities: [],
    activeEncounter: null,
    loreTree: [],
    sessions: [],
    hooks: [],
    rollTables: [],
    homebrewSettings: {},
  };

  fs.writeFileSync(
    path.join(vaultPath, 'db.json'),
    JSON.stringify(initialDb, null, 2),
    'utf-8'
  );

  // Registra o cofre no app-config.json
  const now = new Date().toISOString();
  const vault: VaultInfo = {
    id,
    name,
    path: vaultPath,
    createdAt: now,
    lastModified: now,
  };

  const config = readConfig();
  config.vaults.push(vault);
  writeConfig(config);

  console.log(`[VaultManager] Cofre criado: "${name}" em ${vaultPath}`);
  return vault;
}

/**
 * Retorna o cofre ativo (último aberto pelo usuário), ou null se nenhum foi definido.
 */
export function getActiveVault(): VaultInfo | null {
  const config = readConfig();
  if (!config.lastActiveVaultId) return null;
  return config.vaults.find(v => v.id === config.lastActiveVaultId) ?? null;
}

/**
 * Define o cofre ativo pelo ID.
 * Atualiza o campo lastActiveVaultId no app-config.json.
 *
 * @param id — ID do cofre a ser ativado
 */
export function setActiveVault(id: string): void {
  const config = readConfig();
  config.lastActiveVaultId = id;
  writeConfig(config);
  console.log(`[VaultManager] Cofre ativo definido: ${id}`);
}
