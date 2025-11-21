/**
 * @module ENV
 * @description Variáveis de ambiente tipadas e centralizadas para o servidor
 *
 * Carrega todas as variáveis de ambiente do processo com valores padrão seguros.
 * Usado em toda a aplicação server-side para configuração.
 *
 * **Variáveis Importantes:**
 * - `JWT_SECRET`: Chave secreta para assinar tokens JWT (MUDE EM PRODUÇÃO!)
 * - `JWT_EXPIRES_IN`: Tempo de expiração dos tokens (padrão: 7 dias)
 * - `DATABASE_URL`: String de conexão MySQL
 * - `OWNER_OPEN_ID`: OpenID do usuário admin principal
 * - `NODE_ENV`: Ambiente de execução (development, production)
 *
 * @example
 * import { ENV } from './env';
 * const token = createToken(user, ENV.jwtSecret);
 */

export const ENV = {
  /** ID da aplicação */
  appId: process.env.VITE_APP_ID ?? "",

  /** Chave secreta para JWT - ALTERAR EM PRODUÇÃO! */
  jwtSecret: process.env.JWT_SECRET ?? "your-secret-key-change-in-production",

  /** Chave secreta para cookies de sessão - ALTERAR EM PRODUÇÃO! */
  cookieSecret: process.env.COOKIE_SECRET ?? process.env.JWT_SECRET ?? "your-cookie-secret-change-in-production",

  /** Tempo de expiração do token JWT (ex: "7d", "24h", "60m") */
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",

  /** URL de conexão do banco MySQL */
  databaseUrl: process.env.DATABASE_URL ?? "",

  /** URL do servidor OAuth (se usar autenticação OAuth) */
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",

  /** OpenID do proprietário/admin principal do sistema */
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",

  /** Indica se está rodando em produção */
  isProduction: process.env.NODE_ENV === "production",

  /** URL da API Forge (se usar AI features) */
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",

  /** Chave da API Forge */
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
