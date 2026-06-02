INSERT INTO `planos_saas` (
  `nome`,
  `codigo`,
  `descricao`,
  `precoMensal`,
  `precoAnual`,
  `limiteUsuarios`,
  `limitePdvs`,
  `limiteProdutos`,
  `modulosPermitidos`,
  `ativo`
) VALUES
  (
    'Starter',
    'starter',
    'Plano comercial para pequenos negocios.',
    15000,
    120000,
    1,
    9999,
    1000,
    '["pdv","estoque","financeiro","nfce"]',
    true
  ),
  (
    'Profissional',
    'profissional',
    'Plano comercial para lojas em crescimento.',
    25000,
    240000,
    9999,
    9999,
    999999,
    '["pdv","estoque","financeiro","nfce","pdv_offline","coletor_mobile","suporte_whatsapp"]',
    true
  )
ON DUPLICATE KEY UPDATE
  `nome` = VALUES(`nome`),
  `descricao` = VALUES(`descricao`),
  `precoMensal` = VALUES(`precoMensal`),
  `precoAnual` = VALUES(`precoAnual`),
  `limiteUsuarios` = VALUES(`limiteUsuarios`),
  `limitePdvs` = VALUES(`limitePdvs`),
  `limiteProdutos` = VALUES(`limiteProdutos`),
  `modulosPermitidos` = VALUES(`modulosPermitidos`),
  `ativo` = VALUES(`ativo`);
