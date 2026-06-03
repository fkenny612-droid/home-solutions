import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.enableCors({ origin: process.env.WEB_URL ? [process.env.WEB_URL, 'http://localhost:3000'] : '*' })
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  app.setGlobalPrefix('api/v1')

  // Health check (used by Railway)
  const httpAdapter = app.getHttpAdapter()
  httpAdapter.get('/api/v1/health', (_req: any, res: any) => {
    res.json({ status: 'ok', ts: new Date().toISOString() })
  })

  const port = process.env.PORT || 4000
  await app.listen(port)
  console.log(`Home Solutions API running on http://localhost:${port}/api/v1`)
}

bootstrap()
