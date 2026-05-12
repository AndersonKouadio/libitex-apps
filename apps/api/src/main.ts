import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { initSentryServer, Sentry } from "./common/sentry/sentry";
// Sentry doit s'initialiser AVANT l'import du AppModule pour que les
// instrumentations Node (http, undici...) hookent correctement.
initSentryServer();
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";

/**
 * Fix C4 Module 8 : handlers globaux pour les erreurs non geres par le
 * filtre Nest (qui ne voit que les exceptions HTTP).
 *
 * - uncaughtException : un throw synchrone hors du contexte HTTP (bg job,
 *   setInterval, EventEmitter listener)
 * - unhandledRejection : une promise rejetee dont personne ne fait .catch()
 *
 * Strategie : log + Sentry + on continue de tourner (pas d'exit 1 brutal).
 * Sans ces handlers, Node 20+ peut crasher le process sur unhandled.
 */
function installerHandlersProcessus(logger: Logger): void {
  process.on("uncaughtException", (err) => {
    logger.error(`[uncaughtException] ${err.message}`, err.stack);
    Sentry.captureException(err, { tags: { source: "uncaughtException" } });
  });

  process.on("unhandledRejection", (reason) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    logger.error(`[unhandledRejection] ${err.message}`, err.stack);
    Sentry.captureException(err, { tags: { source: "unhandledRejection" } });
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger("Bootstrap");
  installerHandlersProcessus(logger);

  // Prefixe global
  app.setGlobalPrefix("api/v1");

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Exception filter global
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Intercepteur de reponse standard
  app.useGlobalInterceptors(new ResponseInterceptor());

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(",") || [
      "http://localhost:3001",
      "http://localhost:3000",
    ],
    credentials: true,
  });

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle("LIBITEX API")
    .setDescription("API de la plateforme ERP, POS & E-Commerce")
    .setVersion("0.1.0")
    .addBearerAuth()
    .addTag("Authentification", "Inscription et connexion")
    .addTag("Catalogue", "Produits, variantes, catégories")
    .addTag("Stock", "Mouvements de stock, emplacements")
    .addTag("Vente / POS", "Tickets de caisse, paiements")
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`API demarree sur http://localhost:${port}`);
  logger.log(`Documentation Swagger : http://localhost:${port}/docs`);
}

bootstrap();
