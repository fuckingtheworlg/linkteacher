import { Module } from '@nestjs/common';
import { ArticlesController } from './articles.controller';
import { AdminArticlesController } from './admin-articles.controller';

@Module({
  controllers: [ArticlesController, AdminArticlesController],
})
export class ArticlesModule {}
