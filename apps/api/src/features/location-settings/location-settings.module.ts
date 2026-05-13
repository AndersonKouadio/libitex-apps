import { Module } from "@nestjs/common";
import { LocationSettingsController } from "./location-settings.controller";
import { LocationSettingsService } from "./location-settings.service";
import { LocationSettingsRepository } from "./repositories/location-settings.repository";

@Module({
  controllers: [LocationSettingsController],
  providers: [LocationSettingsService, LocationSettingsRepository],
  // Exporte le service pour injection dans VenteService (D2)
  exports: [LocationSettingsService],
})
export class LocationSettingsModule {}
