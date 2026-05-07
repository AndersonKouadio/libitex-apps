import { Module } from "@nestjs/common";
import { IngredientController } from "./ingredient.controller";
import { IngredientService } from "./ingredient.service";
import { IngredientRepository } from "./repositories/ingredient.repository";

@Module({
  controllers: [IngredientController],
  providers: [IngredientService, IngredientRepository],
  exports: [IngredientService],
})
export class IngredientModule {}
