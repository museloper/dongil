import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './common/prisma.module';
import { AuthGuard } from './common/auth.guard';
import { AuthModule } from './modules/auth/auth.module';
import { BooksModule } from './modules/books/books.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { StatsModule } from './modules/stats/stats.module';
import { ExportModule } from './modules/export/export.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    BooksModule,
    AccountsModule,
    CategoriesModule,
    TransactionsModule,
    BudgetsModule,
    StatsModule,
    ExportModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
