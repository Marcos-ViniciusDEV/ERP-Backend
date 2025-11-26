/**
 * @swagger
 * tags:
 *   name: Fornecedores
 *   description: Supplier management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Fornecedor:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         nome:
 *           type: string
 *         cnpj:
 *           type: string
 *         email:
 *           type: string
 *         telefone:
 *           type: string
 *         endereco:
 *           type: string
 */

/**
 * @swagger
 * /fornecedores:
 *   get:
 *     summary: List all suppliers
 *     tags: [Fornecedores]
 *     responses:
 *       200:
 *         description: List of suppliers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Fornecedor'
 *       500:
 *         description: Server error
 *   post:
 *     summary: Create a new supplier
 *     tags: [Fornecedores]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Fornecedor'
 *     responses:
 *       201:
 *         description: Supplier created
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /fornecedores/{id}:
 *   put:
 *     summary: Update supplier
 *     tags: [Fornecedores]
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
 *             $ref: '#/components/schemas/Fornecedor'
 *     responses:
 *       200:
 *         description: Supplier updated
 *       500:
 *         description: Server error
 *   delete:
 *     summary: Delete supplier
 *     tags: [Fornecedores]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Supplier deleted
 *       500:
 *         description: Server error
 */
