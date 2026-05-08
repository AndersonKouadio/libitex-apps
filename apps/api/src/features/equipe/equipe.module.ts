import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { EquipeController } from "./equipe.controller";
import { EquipeService } from "./equipe.service";

@Module({
  imports: [AuthModule],
  controllers: [EquipeController],
  providers: [EquipeService],
})
export class EquipeModule {}
