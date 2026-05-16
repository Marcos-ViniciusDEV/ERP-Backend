const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'tests', 'unit');

function patchFile(file, replacements) {
    const fullPath = path.join(dir, file);
    if (!fs.existsSync(fullPath)) return;
    let content = fs.readFileSync(fullPath, 'utf8');
    let patched = false;
    
    for (const [search, replace] of replacements) {
        if (content.match(search)) {
            content = content.replace(search, replace);
            patched = true;
        }
    }
    
    if (patched) {
        fs.writeFileSync(fullPath, content);
        console.log(`Patched ${file}`);
    }
}

// Patch departamento
patchFile('departamento.service.test.ts', [
    [/departamentoService\.list\(\)/g, "departamentoService.list(1)"],
    [/departamentoService\.create\(input\)/g, "departamentoService.create(1, input)"],
    [/departamentoService\.update\(1, input\)/g, "departamentoService.update(1, 1, input)"],
    [/departamentoService\.remove\(1\)/g, "departamentoService.remove(1, 1)"],
]);

// Patch fornecedor
patchFile('fornecedor.service.test.ts', [
    [/fornecedorService\.update\(1, 1, input\)/g, "fornecedorService.update(1, 1, input)"], // Revert previous bad match if any or do nothing
    [/fornecedorService\.update\(1, input\)/g, "fornecedorService.update(1, 1, input)"],
    [/fornecedorService\.remove\(1\)/g, "fornecedorService.remove(1, 1)"],
]);

// Patch kardex
patchFile('kardex.service.test.ts', [
    [/kardexService\.registrarMovimento\(input\)/g, "kardexService.registrarMovimento(1, input)"],
    [/kardexService\.registrarMultiplosMovimentos\(\[input\]\)/g, "kardexService.registrarMultiplosMovimentos(1, [input])"],
    [/kardexService\.getMovimentosByProduto\(1\)/g, "kardexService.getMovimentosByProduto(1, 1)"],
    [/kardexService\.getMovimentosDia\(\)/g, "kardexService.getMovimentosDia(1)"],
]);

// Patch pdv
patchFile('pdv.service.test.ts', [
    [/pdvService\.listMovements\(\)/g, "pdvService.listMovements(1)"],
    [/pdvService\.listMovements\(filters\)/g, "pdvService.listMovements(1, filters)"],
]);

// Patch produto
patchFile('produto.service.test.ts', [
    [/produtoService\.getById\(1\)/g, "produtoService.getById(1, 1)"],
    [/produtoService\.getByCodigoDeBarras\('123'\)/g, "produtoService.getByCodigoDeBarras(1, '123')"],
    [/produtoService\.checkEstoque\(1, 5\)/g, "produtoService.checkEstoque(1, 1, 5)"],
    [/produtoService\.atualizarEstoque\(1, 10\)/g, "produtoService.atualizarEstoque(1, 1, 10)"],
]);

// Patch venda
patchFile('venda.service.test.ts', [
    [/vendaService\.getByPeriodo\('2023-01-01', '2023-01-31'\)/g, "vendaService.getByPeriodo(1, '2023-01-01', '2023-01-31')"],
    [/vendaService\.totalVendasHoje\(\)/g, "vendaService.totalVendasHoje(1)"],
    [/vendaService\.getByProduto\(1\)/g, "vendaService.getByProduto(1, 1)"],
]);
