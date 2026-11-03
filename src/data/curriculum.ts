export type Lang = 'pt' | 'en'
export type LocalText = { pt: string; en: string }
export type Experience = {
  id: string
  company: string
  position: LocalText
  period: LocalText
  location: LocalText
  summary: LocalText
  highlights: { pt: string[]; en: string[] }
  tags: string[]
  focus: 'operations' | 'data' | 'leadership' | 'research'
}
export type Education = { school: string; degree: LocalText; period: string; note?: LocalText }

export const profile = {
  name: 'Filipe Carneiro da Silva',
  location: 'Serra, Espírito Santo, Brasil',
  email: 'filipecarneirodasilva@gmail.com',
  linkedin: 'https://www.linkedin.com/in/filipecarneirodasilva/',
  github: 'https://github.com/srcarneiro1',
  research: 'https://github.com/srcarneiro1/archival-network-analysis-apees',
  role: {
    pt: 'Supervisor de Processos e Inventário',
    en: 'Process & Inventory Supervisor',
  },
  tagline: {
    pt: 'Operações, dados e tecnologia integrados para decisões melhores.',
    en: 'Operations, data and technology working together for better decisions.',
  },
  summary: {
    pt: 'Profissional com trajetória em gestão de processos, inventários e operações logísticas industriais, portuárias e multiclientes. Atuo com planejamento de capacidade, análise de indicadores, gestão de estoques, melhoria contínua e desenvolvimento de soluções baseadas em dados. Integro conhecimento operacional a ferramentas de Business Intelligence, automação e desenvolvimento de aplicações.',
    en: 'Professional experienced in process management, inventory control and industrial, port and multi-client logistics operations. I work with capacity planning, performance indicators, stock management, continuous improvement and data-driven solutions, bridging operational expertise with business intelligence, automation and application development.',
  },
}

export const experiences: Experience[] = [
  {
    id: 'unilog',
    company: 'Unilog Express',
    position: { pt: 'Supervisor de Processos e Inventário', en: 'Process & Inventory Supervisor' },
    period: { pt: 'nov 2025 — atual', en: 'Nov 2025 — Present' },
    location: { pt: 'Serra, ES', en: 'Serra, Brazil' },
    summary: {
      pt: 'Supervisão de processos, inventários e eficiência operacional em logística multiclientes, com atuação em estoques, planejamento de recursos, indicadores e gestão de equipes.',
      en: 'Oversight of processes, inventories and operational efficiency in a multi-client logistics environment, covering inventory management, resource planning, KPIs and team leadership.',
    },
    highlights: {
      pt: [
        'Planejamento de inventários cíclicos e gerais, conciliação físico-sistêmica e tratamento de divergências.',
        'Análises de Curva ABC, giro e dimensionamento de posições de picking.',
        'Elaboração de forecasts e dimensionamento de capacidade, headcount e FTEs.',
        'Acompanhamento de indicadores, custos, FCAs e planos de melhoria do inbound ao outbound.',
        'Validação de informações em BI e gestão da equipe de inventário.',
      ],
      en: [
        'Planning cycle and general inventories, reconciling physical and system records, and investigating discrepancies.',
        'ABC classification, inventory turnover analysis and picking-location sizing.',
        'Forecasting and planning operational capacity, headcount and FTE requirements.',
        'Monitoring KPIs, costs, corrective action plans and process improvements from inbound to outbound.',
        'Validating BI information and coordinating the inventory team.',
      ],
    },
    tags: ['Inventários', 'Forecast', 'BI', 'Gestão de equipes'],
    focus: 'leadership',
  },
  {
    id: 'seatrium',
    company: 'Seatrium',
    position: { pt: 'Analista de Logística Pleno', en: 'Mid-level Logistics Analyst' },
    period: { pt: 'jun 2025 — nov 2025', en: 'Jun 2025 — Nov 2025' },
    location: { pt: 'Aracruz, ES', en: 'Aracruz, Brazil' },
    summary: {
      pt: 'Análise e controle de informações em logística integrada, operações portuárias e processos de importação e exportação.',
      en: 'Analysis and information management across integrated logistics, port operations, and import/export processes.',
    },
    highlights: {
      pt: [
        'Análise de KPIs, acompanhamento de metas e elaboração de relatórios técnicos e apresentações executivas.',
        'Apoio ao planejamento de importação e exportação, packing lists e controles operacionais.',
        'Utilização de SAP, ALCIS, WMS e Excel avançado no controle de informações.',
        'Participação em auditorias, padronização de procedimentos e treinamentos logísticos.',
      ],
      en: [
        'Analyzing KPIs and targets, producing technical reports and executive presentations.',
        'Supporting import/export planning, packing lists and operational documentation.',
        'Managing information using SAP, ALCIS, WMS and advanced Excel.',
        'Supporting audits, process standardization and logistics training.',
      ],
    },
    tags: ['Logística portuária', 'SAP', 'WMS', 'KPIs'],
    focus: 'operations',
  },
  {
    id: 'suzano-senior',
    company: 'Suzano',
    position: { pt: 'Analista de Operações Logísticas Sênior', en: 'Senior Logistics Operations Analyst' },
    period: { pt: 'jul 2024 — jun 2025', en: 'Jul 2024 — Jun 2025' },
    location: { pt: 'Aracruz, ES', en: 'Aracruz, Brazil' },
    summary: {
      pt: 'Planejamento de operações logísticas industriais e integração entre produção, estoques, transporte rodoviário e porto.',
      en: 'Planning industrial logistics operations and coordinating flows between production, inventory, road transport and port facilities.',
    },
    highlights: {
      pt: [
        'Planejamento de expedições e análise de capacidade dos fluxos entre produção e porto.',
        'Gestão de estoques, inventários e planos de reprocessamento produtivo.',
        'Monitoramento de KPIs, processos auditáveis e iniciativas de melhoria de desempenho.',
        'Análise de dados, ETL e automação com Python, SQL, Power BI, Excel e SAP.',
      ],
      en: [
        'Planning shipments and assessing capacity between production and port operations.',
        'Managing inventories, stock controls and production reprocessing plans.',
        'Monitoring KPIs, auditable processes and performance improvements.',
        'Using Python, SQL, Power BI, Excel, SAP, ETL and automation to support decisions.',
      ],
    },
    tags: ['Python', 'SQL', 'Power BI', 'SAP', 'ETL'],
    focus: 'data',
  },
  {
    id: 'suzano-imigrantes',
    company: 'Suzano',
    position: { pt: 'Analista de Logística e Distribuição I — Imigrantes', en: 'Logistics & Distribution Analyst I — Imigrantes' },
    period: { pt: 'mai 2024 — jul 2024', en: 'May 2024 — Jul 2024' },
    location: { pt: 'São Paulo, SP', en: 'São Paulo, Brazil' },
    summary: {
      pt: 'Consolidação de indicadores de 23 Centros de Distribuição, com suporte analítico à gestão de seis coordenadores e uma gerência da UNPE.',
      en: 'Consolidating indicators across 23 distribution centers and providing analytical support to six coordinators and one UNPE management position.',
    },
    highlights: {
      pt: [
        'Monitoramento de resultados, análise de desvios e consolidação de dados de 23 CDs.',
        'Preparação de relatórios, apresentações gerenciais e informações para reuniões de resultados.',
        'Acompanhamento de alvarás e documentação dos Centros de Distribuição.',
        'Continuidade das análises operacionais e de estoques anteriormente realizadas no CD de Serra.',
      ],
      en: [
        'Monitoring results, investigating deviations and consolidating data across 23 distribution centers.',
        'Preparing management reports, executive presentations and performance review materials.',
        'Tracking licenses, permits and operational documentation for distribution centers.',
        'Continuing the inventory and operational analytics performed at the Serra distribution center.',
      ],
    },
    tags: ['23 CDs', 'KPIs', 'Relatórios gerenciais', 'Documentação'],
    focus: 'data',
  },
  {
    id: 'suzano-serra',
    company: 'Suzano',
    position: { pt: 'Analista de Logística e Distribuição I — Serra', en: 'Logistics & Distribution Analyst I — Serra' },
    period: { pt: 'jun 2023 — mai 2024', en: 'Jun 2023 — May 2024' },
    location: { pt: 'Serra, ES', en: 'Serra, Brazil' },
    summary: {
      pt: 'Análise e acompanhamento de processos de distribuição, estoques, indicadores e inventários.',
      en: 'Analysis of distribution processes, stock management, performance indicators and inventories.',
    },
    highlights: {
      pt: [
        'Desenvolvimento e acompanhamento de indicadores de desempenho logístico.',
        'Análise de dados para investigação de desvios e melhoria de processos.',
        'Acompanhamento de inventários rotativos e oficiais, auditorias e certificações.',
        'Utilização de SAP e ferramentas de automação no controle das rotinas.',
      ],
      en: [
        'Developing and monitoring logistics performance indicators.',
        'Analyzing operational data to identify deviations and process improvement opportunities.',
        'Supporting cycle and official inventories, audits and certifications.',
        'Using SAP and automation tools for process control.',
      ],
    },
    tags: ['Inventários', 'Indicadores', 'SAP', 'Auditoria'],
    focus: 'operations',
  },
  {
    id: 'suzano-transport',
    company: 'Suzano',
    position: { pt: 'Auxiliar de Transportes', en: 'Transport Operations Assistant' },
    period: { pt: 'mar 2022 — jun 2023', en: 'Mar 2022 — Jun 2023' },
    location: { pt: 'Espírito Santo', en: 'Espírito Santo, Brazil' },
    summary: {
      pt: 'Suporte aos processos administrativos e operacionais de transportes, faturamento e documentação logística.',
      en: 'Supporting transport operations, freight billing and logistics documentation.',
    },
    highlights: {
      pt: [
        'Acompanhamento de faturamento de cargas, notas fiscais e liberação de pagamentos.',
        'Controle documental, relatórios de cargas e registros operacionais no SAP.',
      ],
      en: [
        'Tracking freight billing, invoices and payment release processes.',
        'Maintaining transport documentation, reports and operational SAP records.',
      ],
    },
    tags: ['Transportes', 'Faturamento', 'SAP'],
    focus: 'operations',
  },
  {
    id: 'ufes',
    company: 'Universidade Federal do Espírito Santo — UFES',
    position: { pt: 'Pesquisador de Iniciação Científica (CNPq)', en: 'Undergraduate Researcher (CNPq-funded)' },
    period: { pt: 'set 2023 — ago 2024', en: 'Sep 2023 — Aug 2024' },
    location: { pt: 'Vitória, ES', en: 'Vitória, Brazil' },
    summary: {
      pt: 'Pesquisa sobre vínculos arquivísticos por meio de análise de redes de informação, financiada pelo CNPq.',
      en: 'CNPq-funded research into archival relationships through information network analysis.',
    },
    highlights: {
      pt: [
        'Coleta, preparação e tratamento de dados de acervos documentais.',
        'Análise e visualização de redes com OpenRefine e Gephi.',
      ],
      en: [
        'Collecting, preparing and cleaning archival collection data.',
        'Analyzing and visualizing information networks with OpenRefine and Gephi.',
      ],
    },
    tags: ['Pesquisa', 'Gephi', 'OpenRefine', 'Dados'],
    focus: 'research',
  },
  {
    id: 'le-card',
    company: 'Le Card — Administradora de Cartões',
    position: { pt: 'Auxiliar Administrativo', en: 'Administrative Assistant' },
    period: { pt: 'out 2021 — mar 2022', en: 'Oct 2021 — Mar 2022' },
    location: { pt: 'Espírito Santo', en: 'Espírito Santo, Brazil' },
    summary: {
      pt: 'Rotinas administrativas, atendimento, suporte à rede credenciada e tratamento de solicitações.',
      en: 'Administrative activities, customer support and assistance to the affiliated network.',
    },
    highlights: {
      pt: ['Organização de controles operacionais e resolução de demandas administrativas.'],
      en: ['Organizing operational controls and resolving administrative requests.'],
    },
    tags: ['Administração', 'Atendimento'],
    focus: 'operations',
  },
  {
    id: 'sollo',
    company: 'Sollo Brasil',
    position: { pt: 'Monitor de Treinamento Júnior', en: 'Junior Training Monitor' },
    period: { pt: 'jun 2021 — set 2021', en: 'Jun 2021 — Sep 2021' },
    location: { pt: 'Vitória, ES', en: 'Vitória, Brazil' },
    summary: {
      pt: 'Treinamento de equipes e apoio à supervisão em rotinas administrativas.',
      en: 'Delivering employee training and assisting supervision with administrative routines.',
    },
    highlights: {
      pt: ['Condução de treinamentos e apoio ao controle de ponto, férias e padrões de qualidade.'],
      en: ['Delivering training and supporting timekeeping, vacation and quality procedures.'],
    },
    tags: ['Treinamento', 'Qualidade'],
    focus: 'leadership',
  },
  {
    id: 'ivox',
    company: 'iVOX Contact Center',
    position: { pt: 'Assistente de Treinamento e Qualidade', en: 'Training & Quality Assistant' },
    period: { pt: 'abr 2020 — jun 2021', en: 'Apr 2020 — Jun 2021' },
    location: { pt: 'Vitória, ES', en: 'Vitória, Brazil' },
    summary: {
      pt: 'Capacitação, monitoria de qualidade e melhoria dos processos de atendimento.',
      en: 'Employee training, quality monitoring and improvements to service processes.',
    },
    highlights: {
      pt: ['Aplicação de treinamentos, monitorias, feedbacks e relatórios de desempenho.'],
      en: ['Delivering training, quality assessments, feedback and performance reports.'],
    },
    tags: ['Treinamento', 'Qualidade', 'Indicadores'],
    focus: 'leadership',
  },
]

export const education: Education[] = [
  {
    school: 'Faculdade de Minas',
    degree: { pt: 'Pós-graduação lato sensu — Inteligência Artificial Premium', en: 'Postgraduate specialization — Artificial Intelligence' },
    period: '2025',
  },
  {
    school: 'Faculdade de Minas',
    degree: { pt: 'Pós-graduação lato sensu — Segurança da Informação', en: 'Postgraduate specialization — Information Security' },
    period: '2025',
  },
  {
    school: 'Universidade Federal do Espírito Santo (UFES)',
    degree: { pt: 'Bacharelado em Arquivologia', en: "Bachelor's degree in Archival Science" },
    period: '2019 — 2024',
    note: {
      pt: 'Iniciação científica financiada pelo CNPq. Análise de redes de informação com OpenRefine e Gephi.',
      en: 'CNPq-funded undergraduate research. Information network analysis with OpenRefine and Gephi.',
    },
  },
]

export const skills = [
  {
    name: { pt: 'Gestão & operações', en: 'Management & operations' },
    items: ['Gestão de processos', 'Inventários', 'Gestão de estoques', 'Planejamento operacional', 'Forecast', 'Gestão de equipes', 'Logística e distribuição', 'Auditorias'],
  },
  {
    name: { pt: 'Dados & inteligência de negócios', en: 'Data & business intelligence' },
    items: ['Power BI', 'Power Query', 'SQL', 'Python', 'Excel avançado', 'ETL', 'KPIs', 'Análise de dados'],
  },
  {
    name: { pt: 'Tecnologia & sistemas', en: 'Technology & systems' },
    items: ['JavaScript', 'TypeScript', 'React', 'APIs REST', 'Git', 'GitHub', 'SAP', 'WMS', 'ALCIS'],
  },
]

export const research = {
  name: 'Archival Network Analysis — APEES',
  description: {
    pt: 'Projeto acadêmico de pesquisa em vínculos arquivísticos e análise de redes de informação. O repositório público documenta materiais e métodos de trabalho.',
    en: 'Academic research into archival relationships and information network analysis. The public repository documents methods and research materials.',
  },
}
