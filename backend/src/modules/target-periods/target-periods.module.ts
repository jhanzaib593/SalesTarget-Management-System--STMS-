import { Module } from '@nestjs/common';
import { TargetPeriodsService } from './target-periods.service';
import { TargetPeriodsController } from './target-periods.controller';

@Module({
  controllers: [TargetPeriodsController],
  providers: [TargetPeriodsService],
  exports: [TargetPeriodsService],
})
export class TargetPeriodsModule {}
