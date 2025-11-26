/**
 * @swagger
 * tags:
 *   name: Vendas
 *   description: Sales management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Venda:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         clienteId:
 *           type: integer
 *         usuarioId:
 *           type: integer
 *         total:
 *           type: number
 *         desconto:
 *           type: number
 *         formaPagamento:
 *           type: string
 *         dataVenda:
 *           type: string
 *           format: date-time
 *         itens:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               produtoId:
 *                 type: integer
 *               quantidade:
 *                 type: number
 *               precoUnitario:
 *                 type: number
 */

/**
 * @swagger
 * /vendas:
 *   get:
 *     summary: List all sales
 *     tags: [Vendas]
 *     responses:
 *       200:
 *         description: List of sales
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Venda'
 *       500:
 *         description: Server error
 *   post:
 *     summary: Create a new sale
 *     tags: [Vendas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Venda'
 *     responses:
 *       201:
 *         description: Sale created
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /vendas/periodo:
 *   get:
 *     summary: Get sales by period
 *     tags: [Vendas]
 *     parameters:
 *       - in: query
 *         name: dataInicio
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dataFim
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of sales in period
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Venda'
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /vendas/hoje:
 *   get:
 *     summary: Get total sales for today
 *     tags: [Vendas]
 *     responses:
 *       200:
 *         description: Total sales
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: number
 *                 quantidade:
 *                   type: integer
 *       500:
 *         description: Server error
 */
