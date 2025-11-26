/**
 * @swagger
 * tags:
 *   name: Produtos
 *   description: Product management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Produto:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         nome:
 *           type: string
 *         codigoBarras:
 *           type: string
 *         precoVenda:
 *           type: number
 *         precoCusto:
 *           type: number
 *         estoqueAtual:
 *           type: number
 *         estoqueMinimo:
 *           type: number
 *         unidade:
 *           type: string
 *         categoriaId:
 *           type: integer
 *         fornecedorId:
 *           type: integer
 */

/**
 * @swagger
 * /produtos:
 *   get:
 *     summary: List all products
 *     tags: [Produtos]
 *     responses:
 *       200:
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Produto'
 *   post:
 *     summary: Create a new product
 *     tags: [Produtos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Produto'
 *     responses:
 *       201:
 *         description: Product created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Produto'
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /produtos/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Produtos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Produto'
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 *   put:
 *     summary: Update product
 *     tags: [Produtos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Produto'
 *     responses:
 *       200:
 *         description: Product updated
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 *   delete:
 *     summary: Delete product
 *     tags: [Produtos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Product deleted
 *       400:
 *         description: Error deleting product
 */

/**
 * @swagger
 * /produtos/{id}/precos:
 *   put:
 *     summary: Update product prices
 *     tags: [Produtos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               precoCusto:
 *                 type: number
 *     responses:
 *       200:
 *         description: Prices updated
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /produtos/estoque-baixo:
 *   get:
 *     summary: List products with low stock
 *     tags: [Produtos]
 *     responses:
 *       200:
 *         description: List of low stock products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Produto'
 */

/**
 * @swagger
 * /produtos/backfill-last-purchase:
 *   post:
 *     summary: Backfill last purchase data
 *     tags: [Produtos]
 *     responses:
 *       200:
 *         description: Backfill successful
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /produtos/{id}/movimentos:
 *   get:
 *     summary: Get product stock movements
 *     tags: [Produtos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of movements
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /produtos/{id}/historico-vendas:
 *   get:
 *     summary: Get product sales history
 *     tags: [Produtos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sales history
 *       500:
 *         description: Server error
 */
