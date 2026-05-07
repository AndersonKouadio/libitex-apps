import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger("Bootstrap");

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
    .addTag("Catalogue", "Produits, variantes, categories")
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
