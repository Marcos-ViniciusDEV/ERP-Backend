INSERT INTO `support_tutorials`
(`empresaId`, `titulo`, `descricao`, `conteudo`, `modulo`, `tempoEstimado`, `fixado`, `ordem`, `ativo`)
VALUES
(
  NULL,
  'Como configurar uma maquininha no sistema',
  'Passo a passo para cadastrar uma maquininha, configurar taxas e enviar a carga para o PDV.',
  'Objetivo: configurar uma maquininha no ERP para o PDV usar as formas de pagamento corretas e registrar taxas de débito, crédito, parcelado e PIX.

1. Acesse a tela de pagamentos
Entre no ERP e vá em Configurações > Pagamentos e Maquininhas.

2. Configure as formas de pagamento
Na aba Formas de pagamento, habilite Pagamentos manuais para permitir dinheiro, cartão manual e PIX manual.
Se a maquininha tiver integração por API, habilite POS/API.
Se a empresa usar TEF com PinPad e integrador homologado, habilite TEF integrado.
Se for usar PIX integrado, habilite PIX integrado.

3. Cadastre a adquirente ou provedor
Na aba Maquininhas e TEF, preencha Nome para exibição com um nome fácil de identificar.
Exemplos: Mercado Pago - Caixa 1, Stone - Loja Principal, PagBank - Balcão.
No campo Provedor, escolha Mercado Pago, Stone, PagBank, Itaú, Cielo, Rede, Getnet ou outro disponível.
Escolha o ambiente: Homologação para teste ou Produção para uso real.
Clique em Adicionar.

4. Cadastre o terminal do PDV
Ainda na aba Maquininhas e TEF, vá em Terminal por PDV.
Preencha o PDV ID exatamente como o caixa usa, por exemplo PDV001.
Informe o Nome do terminal, por exemplo Mercado Pago Caixa 1.
Escolha o Tipo:
Manual: quando o operador passa o cartão fora do sistema e só registra a venda no PDV.
POS/API: quando a maquininha permite integração por API, como Mercado Pago Point quando disponível.
TEF: quando existe integrador TEF local e PinPad homologado.
Clique em Adicionar terminal.

5. Configure as taxas
Vá para a aba Taxas e recebimentos.
Cadastre as taxas de Débito, Crédito à vista, Crédito parcelado e PIX.
Informe a taxa em percentual, o prazo de recebimento e a faixa de parcelas quando for crédito parcelado.
Se o provedor permitir consulta por API, clique em Atualizar taxas pela API.
Revise a comparação entre Taxa atual e Taxa API antes de aplicar.
Clique em Aplicar taxas encontradas somente se estiver tudo correto.

6. Salve e envie para o PDV
Clique em Salvar configurações.
Depois clique em Enviar carga PDV.
Os PDVs online recebem a configuração na hora.
Os PDVs offline recebem na próxima carga ou sincronização.

7. Teste no PDV
Abra o PDV e faça uma venda de teste.
Na tela de pagamento, confira se aparecem as formas configuradas.
Para modo manual, passe o cartão na maquininha e registre no PDV a forma usada.
Para POS/API ou TEF, a venda só deve finalizar depois do retorno aprovado da integração.

8. Conferência depois da venda
No ERP, acompanhe as vendas e a conciliação.
Confira valor bruto, taxa, valor líquido previsto e prazo de recebimento.

Observação importante: nem toda maquininha permite receber o valor automaticamente pelo sistema. Quando a API ou TEF não estiver disponível, use o modo manual. Nesse modo, o ERP registra a venda e calcula as taxas, mas não envia o valor para a maquininha.',
  'Pagamentos',
  '8 min',
  true,
  100,
  true
);
