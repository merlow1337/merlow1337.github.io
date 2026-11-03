// Utilitários de texto do agente: normalização, tokenização e dicionário de conceitos.
// Tudo roda no navegador, sem API externa e sem enviar dados para lugar nenhum.

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9+#]+/g, ' ')
    .trim()
}

const STOPWORDS = new Set(
  ('a o e de da do das dos em no na nos nas um uma uns umas para por com sem que qual quais quem como onde quando ' +
    'se ao aos à as os ou mais menos muito pouco sobre ja tem ter foi ser sao esta estao isso isto esse essa voce ' +
    'ele ela seu sua seus suas meu minha me te lhe the of and to in on for with an is are was were be what which who how ' +
    'where when do does did have has had you your his her he she it this that at by from as or about me my tell fale conte ' +
    'filipe carneiro silva')
    .split(' '),
)

export function tokenize(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter(token => token.length > 1 && !STOPWORDS.has(token))
    .map(stem)
}

// Stemming leve para português/inglês: reduz plurais e algumas flexões comuns.
function stem(token: string): string {
  if (token.length <= 4) return token
  return token
    .replace(/(coes|cao)$/, 'c')
    .replace(/(mente)$/, '')
    .replace(/(ies)$/, 'y')
    .replace(/(oes|aes)$/, 'a')
    .replace(/(is)$/, 'l')
    .replace(/(es|s)$/, '')
}

export type Concept = { id: string; label: { pt: string; en: string }; synonyms: string[] }

// Dicionário de conceitos com sinônimos PT/EN — funciona como uma "camada semântica" simples:
// a busca entende que "dashboards", "BI" e "Power BI" estão relacionados, por exemplo.
export const concepts: Concept[] = [
  { id: 'powerbi', label: { pt: 'Power BI', en: 'Power BI' }, synonyms: ['power bi', 'powerbi', 'pbi', 'dax'] },
  { id: 'powerquery', label: { pt: 'Power Query', en: 'Power Query' }, synonyms: ['power query', 'linguagem m'] },
  { id: 'bi', label: { pt: 'Business Intelligence', en: 'Business Intelligence' }, synonyms: ['business intelligence', 'bi', 'dashboard', 'dashboards', 'painel', 'paineis', 'relatorios gerenciais', 'reporting', 'relatorio', 'relatorios'] },
  { id: 'sql', label: { pt: 'SQL', en: 'SQL' }, synonyms: ['sql', 'banco de dados', 'bancos de dados', 'database', 'databases', 'query', 'queries', 'postgres', 'postgresql', 'mysql', 'sql server'] },
  { id: 'python', label: { pt: 'Python', en: 'Python' }, synonyms: ['python', 'pandas', 'numpy', 'jupyter'] },
  { id: 'excel', label: { pt: 'Excel avançado', en: 'Advanced Excel' }, synonyms: ['excel', 'planilha', 'planilhas', 'spreadsheet', 'spreadsheets', 'vba', 'procv', 'tabela dinamica'] },
  { id: 'etl', label: { pt: 'ETL / integração de dados', en: 'ETL / data integration' }, synonyms: ['etl', 'pipeline de dados', 'data pipeline', 'integracao de dados', 'data integration', 'consolidacao', 'consolidating'] },
  { id: 'kpi', label: { pt: 'KPIs e indicadores', en: 'KPIs & metrics' }, synonyms: ['kpi', 'kpis', 'indicador', 'indicadores', 'metricas', 'metrics', 'performance indicators', 'sla'] },
  { id: 'data', label: { pt: 'Análise de dados', en: 'Data analysis' }, synonyms: ['analise de dados', 'data analysis', 'analytics', 'analista de dados', 'data analyst', 'dados', 'data'] },
  { id: 'sap', label: { pt: 'SAP', en: 'SAP' }, synonyms: ['sap', 'erp'] },
  { id: 'wms', label: { pt: 'WMS', en: 'WMS' }, synonyms: ['wms', 'warehouse management', 'alcis'] },
  { id: 'inventory', label: { pt: 'Inventários', en: 'Inventory control' }, synonyms: ['inventario', 'inventarios', 'inventory', 'inventories', 'contagem ciclica', 'cycle count', 'acuracidade', 'accuracy', 'conciliacao'] },
  { id: 'stock', label: { pt: 'Gestão de estoques', en: 'Stock management' }, synonyms: ['estoque', 'estoques', 'stock', 'armazenagem', 'armazem', 'warehouse', 'picking', 'curva abc', 'abc'] },
  { id: 'logistics', label: { pt: 'Logística e distribuição', en: 'Logistics & distribution' }, synonyms: ['logistica', 'logistics', 'supply chain', 'cadeia de suprimentos', 'distribuicao', 'distribution', 'centros de distribuicao', 'distribution centers', 'inbound', 'outbound'] },
  { id: 'transport', label: { pt: 'Transportes', en: 'Transportation' }, synonyms: ['transporte', 'transportes', 'transport', 'frete', 'freight', 'roteirizacao', 'rodoviario', 'road transport'] },
  { id: 'port', label: { pt: 'Logística portuária / comex', en: 'Port logistics / trade' }, synonyms: ['portuaria', 'portuarias', 'porto', 'port', 'importacao', 'exportacao', 'import', 'export', 'comex', 'comercio exterior', 'packing list', 'packing lists'] },
  { id: 'forecast', label: { pt: 'Forecast e capacidade', en: 'Forecast & capacity' }, synonyms: ['forecast', 'forecasts', 'forecasting', 'previsao de demanda', 'demand planning', 'planejamento de capacidade', 'capacity planning', 'capacidade', 'capacity', 'headcount', 'fte', 'ftes', 'dimensionamento'] },
  { id: 'planning', label: { pt: 'Planejamento operacional', en: 'Operational planning' }, synonyms: ['planejamento', 'planning', 'planejamento operacional', 'pcp', 'programacao'] },
  { id: 'leadership', label: { pt: 'Gestão de equipes', en: 'Team leadership' }, synonyms: ['gestao de equipes', 'gestao de pessoas', 'lideranca', 'leadership', 'team management', 'supervisao', 'supervisor', 'supervision', 'lider', 'coordenacao', 'team leadership'] },
  { id: 'process', label: { pt: 'Gestão de processos', en: 'Process management' }, synonyms: ['gestao de processos', 'processos', 'process', 'processes', 'melhoria continua', 'continuous improvement', 'lean', 'six sigma', 'kaizen', 'pdca', 'fca', 'fcas'] },
  { id: 'audit', label: { pt: 'Auditorias', en: 'Audits' }, synonyms: ['auditoria', 'auditorias', 'audit', 'audits', 'compliance', 'certificacoes', 'certifications', 'auditaveis'] },
  { id: 'javascript', label: { pt: 'JavaScript', en: 'JavaScript' }, synonyms: ['javascript', 'js', 'node', 'nodejs'] },
  { id: 'typescript', label: { pt: 'TypeScript', en: 'TypeScript' }, synonyms: ['typescript', 'ts'] },
  { id: 'react', label: { pt: 'React', en: 'React' }, synonyms: ['react', 'reactjs', 'front end', 'frontend'] },
  { id: 'api', label: { pt: 'APIs e integrações', en: 'APIs & integrations' }, synonyms: ['api', 'apis', 'rest', 'apis rest', 'webhook', 'webhooks'] },
  { id: 'english', label: { pt: 'Inglês', en: 'English' }, synonyms: ['ingles', 'english'] },
  { id: 'spanish', label: { pt: 'Espanhol', en: 'Spanish' }, synonyms: ['espanhol', 'spanish'] },
  { id: 'git', label: { pt: 'Git / GitHub', en: 'Git / GitHub' }, synonyms: ['git', 'github', 'versionamento', 'version control'] },
  { id: 'automation', label: { pt: 'Automação de processos', en: 'Process automation' }, synonyms: ['automacao', 'automacoes', 'automation', 'rpa', 'automatizar', 'scripts'] },
  { id: 'ai', label: { pt: 'Inteligência Artificial', en: 'Artificial Intelligence' }, synonyms: ['inteligencia artificial', 'ia', 'ai', 'artificial intelligence', 'machine learning', 'ml', 'llm', 'llms', 'agente', 'agentes', 'agents', 'genai', 'ia generativa', 'generative ai'] },
  { id: 'security', label: { pt: 'Segurança da Informação', en: 'Information security' }, synonyms: ['seguranca da informacao', 'information security', 'cybersecurity', 'ciberseguranca', 'lgpd', 'iso 27001'] },
  { id: 'records', label: { pt: 'Governança da informação', en: 'Information governance' }, synonyms: ['arquivologia', 'archival', 'gestao documental', 'documentacao', 'documentation', 'governanca da informacao', 'information governance', 'records management', 'documentos', 'documental'] },
  { id: 'research', label: { pt: 'Pesquisa científica', en: 'Scientific research' }, synonyms: ['pesquisa', 'research', 'cientifica', 'cnpq', 'analise de redes', 'network analysis', 'gephi', 'openrefine'] },
  { id: 'training', label: { pt: 'Treinamento e qualidade', en: 'Training & quality' }, synonyms: ['treinamento', 'treinamentos', 'training', 'qualidade', 'quality', 'monitoria'] },
]

/** Retorna os ids de conceitos presentes num texto (busca por frase inteira, sem acento). */
export function conceptsIn(text: string): string[] {
  const haystack = ' ' + normalize(text) + ' '
  return concepts.filter(concept => concept.synonyms.some(syn => haystack.includes(' ' + syn + ' '))).map(concept => concept.id)
}

export function conceptById(id: string) {
  return concepts.find(concept => concept.id === id)
}

/** Expansão de consulta: adiciona sinônimos dos conceitos citados na pergunta. */
export function expandQuery(query: string): string[] {
  const base = tokenize(query)
  const extra = conceptsIn(query).flatMap(id => conceptById(id)!.synonyms.flatMap(tokenize))
  return [...base, ...extra]
}
