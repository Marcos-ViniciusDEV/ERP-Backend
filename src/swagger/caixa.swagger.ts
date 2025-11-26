/**
 * @swagger
 * tags:
 *   name: Caixa
 *   description: Cash register management endpoints
 */

/**
 * @swagger
 * /caixa:
 *   get:
 *     summary: List all cash register movements
 *     tags: [Caixa]
 *     responses:
 *       200:
 *         description: List of movements
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   tipo:
 *                     type: string
 *                     enum: [ENTRADA, SAIDA]
 *                   valor:
 *                     type: number
 *                   descricao:
 *                     type: string
 *                   data:
 *                     type: string
 *                     format: date-time
 *       500:
 *         description: Server error
 *   post:
 *     summary: Create a new cash register movement
 *     tags: [Caixa]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tipo
 *               - valor
 *               - descricao
 *             properties:
 *               tipo:
 *                 type: string
 *                 enum: [ENTRADA, SAIDA]
 *               valor:
 *                 type: number
 *               descricao:
 *                 type: string
 *     responses:
 *       201:
 *         description: Movement created
 *       500:
 *         description: Server error
 */
