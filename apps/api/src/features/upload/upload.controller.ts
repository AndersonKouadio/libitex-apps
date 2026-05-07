import {
  Controller, Post, UploadedFile, UseInterceptors, UseGuards, BadRequestException, Param,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiParam } from "@nestjs/swagger";
import { StorageService } from "./storage.service";
import { CurrentUser, CurrentUserData } from "../../common/decorators/current-user.decorator";

const SOUS_CHEMINS_AUTORISES = new Set(["produits", "boutiques", "categories"]);

@ApiTags("Uploads")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"))
@Controller("uploads")
export class UploadController {
  constructor(private readonly storage: StorageService) {}

  @Post("image/:cible")
  @ApiOperation({ summary: "Uploader une image (PNG, JPEG, WebP, AVIF, GIF, SVG, max 5 Mo)" })
  @ApiConsumes("multipart/form-data")
  @ApiParam({ name: "cible", enum: ["produits", "boutiques", "categories"] })
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  async uploaderImage(
    @CurrentUser() user: CurrentUserData,
    @Param("cible") cible: string,
    @UploadedFile() fichier: Express.Multer.File,
  ) {
    if (!fichier) throw new BadRequestException("Aucun fichier transmis");
    if (!SOUS_CHEMINS_AUTORISES.has(cible)) {
      throw new BadRequestException("Cible d'upload invalide");
    }
    return this.storage.telecharger({
      fichier,
      tenantId: user.tenantId,
      sousChemin: cible,
    });
  }
}
