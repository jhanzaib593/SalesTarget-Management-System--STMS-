import { Module } from '@nestjs/common';
import { TargetPlansService } from './target-plans.service';
import { TargetPlansController } from './target-plans.controller';

@Module({
  controllers: [TargetPlansController],
  providers: [TargetPlansService],
  exports: [TargetPlansService],
})
export class TargetPlansModule {}
