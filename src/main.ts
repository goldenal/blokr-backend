import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.enableCors({
    origin:
      process.env.CORS_ORIGIN === '*' || !process.env.CORS_ORIGIN
        ? true
        : process.env.CORS_ORIGIN.split(','),
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('blokr API')
    .setDescription(
      'Backend API for blokr — direct-to-professional booking & Paystack payments.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(
    `blokr API listening on http://localhost:${port} (docs at /docs)`,
  );
}
bootstrap().catch((error: unknown) => {
  console.error('Failed to start blokr API', error);
  process.exit(1);
});
