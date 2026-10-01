import { readFileSync } from 'fs';
import { join } from 'path';

// Nest 는 .env 를 자동으로 읽지 않으므로 e2e 실행 시 직접 로드
try {
  for (const line of readFileSync(join(__dirname, '..', '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
} catch {
  /* .env 없으면 환경변수 사용 */
}
