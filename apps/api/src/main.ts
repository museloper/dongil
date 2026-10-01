import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  try {
    process.loadEnvFile();
  } catch {
    /* .env 가 없으면 실제 환경변수 사용 (Docker 등) */
  }
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const doc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('Dongil API').setVersion('0.1').addBearerAuth().build(),
  );
  SwaggerModule.setup('api/docs', app, doc);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  console.log(`API ready: http://localhost:${port}/api/v1  (docs: /api/docs)`);
}
bootstrap();
