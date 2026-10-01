import type { INestApplication } from '@nestjs/common';

/** main.ts 와 e2e 테스트가 같은 설정을 쓰도록 분리 */
export function configureApp(app: INestApplication) {
  app.setGlobalPrefix('api/v1');
  app.enableCors();
}
