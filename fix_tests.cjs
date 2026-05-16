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

// Patch clientes
patchFile('clientes.service.test.ts', [
    [/clientesService\.list\(\)/g, "clientesService.list(1)"],
    [/clientesService\.list\("search"\)/g, 'clientesService.list(1, "search")'],
    [/clientesService\.create\(input\)/g, "clientesService.create(1, input)"],
    [/clientesService\.update\(1, input\)/g, "clientesService.update(1, 1, input)"],
    [/clientesService\.remove\(1\)/g, "clientesService.remove(1, 1)"],
]);

// Patch departamento
patchFile('departamento.service.test.ts', [
    [/departamentoService\.list\(\)/g, "departamentoService.list(1)"],
    [/departamentoService\.create\(input\)/g, "departamentoService.create(1, input)"],
    [/departamentoService\.update\(1, input\)/g, "departamentoService.update(1, 1, input)"],
    [/departamentoService\.remove\(1\)/g, "departamentoService.remove(1, 1)"],
]);

// Patch fornecedor
patchFile('fornecedor.service.test.ts', [
    [/fornecedorService\.list\(\)/g, "fornecedorService.list(1)"],
    [/fornecedorService\.create\(input\)/g, "fornecedorService.create(1, input)"],
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
    [/pdvService\.getCargaInicial\(\)/g, "pdvService.getCargaInicial(1)"],
    [/pdvService\.sincronizar\(input\)/g, "pdvService.sincronizar(1, input)"],
    [/pdvService\.listMovements\(\)/g, "pdvService.listMovements(1)"],
    [/pdvService\.listMovements\(filters\)/g, "pdvService.listMovements(1, filters)"],
]);

// Patch produto
patchFile('produto.service.test.ts', [
    [/produtoService\.list\(\)/g, "produtoService.list(1)"],
    [/produtoService\.create\(input\)/g, "produtoService.create(1, input)"],
    [/produtoService\.update\(1, input\)/g, "produtoService.update(1, 1, input)"],
    [/produtoService\.remove\(1\)/g, "produtoService.remove(1, 1)"],
]);

// Patch venda
patchFile('venda.service.test.ts', [
    [/vendaService\.create\(input, 1\)/g, "vendaService.create(1, input, 1)"],
    [/vendaService\.list\(\)/g, "vendaService.list(1)"],
    [/vendaService\.getById\(1\)/g, "vendaService.getById(1, 1)"],
]);

// Analytics
patchFile('../src/services/analytics.service.ts', [
    [/await db\.insert\(salesGoals\)\.values\(\{/g, "await db.insert(salesGoals).values({\n      empresaId,"]
]);
