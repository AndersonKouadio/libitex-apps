import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiTags, ApiOperation } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ValidateNested, IsArray } from "class-validator";
import { AchatService } from "./achat.service";
import {
  CreerFournisseurDto, ModifierFournisseurDto,
  CreerCommandeDto, ReceptionCommandeDto, ModifierStatutCommandeDto,
  CreerFraisDto, ModifierFraisDto,
} from "./dto/achat.dto";
import { CurrentUser, CurrentUserData } from "../../common/decorators/current-user.decorator";
import { RolesGuard, Roles } from "../../common/guards/roles.guard";

class ImporterFournisseursDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreerFournisseurDto)
  fournisseurs!: CreerFournisseurDto[];
}

@ApiTags("Achats")
@ApiBearerAuth()
@UseGuards(AuthGuard("jwt"), RolesGuard)
@Controller("achats")
export class AchatController {
  constructor(private readonly achatService: AchatService) {}

  // ─── Fournisseurs ─────────────────────────────────────────────────────

  @Post("fournisseurs")
  @ApiOperation({ summary: "Créer un fournisseur" })
  @Roles("ADMIN", "MANAGER", "WAREHOUSE")
  creerFournisseur(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreerFournisseurDto,
  ) {
    return this.achatService.creerFournisseur(user.tenantId, dto);
  }

  @Post("fournisseurs/import")
  @ApiOperation({ summary: "Import en lot de fournisseurs — {total, succes, erreurs[]}" })
  @Roles("ADMIN", "MANAGER", "WAREHOUSE")
  importerFournisseurs(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: ImporterFournisseursDto,
  ) {
    return this.achatService.importerFournisseurs(user.tenantId, dto.fournisseurs);
  }

  @Get("fournisseurs")
  @ApiOperation({ summary: "Lister les fournisseurs" })
  listerFournisseurs(
    @CurrentUser() user: CurrentUserData,
    @Query("recherche") recherche?: string,
  ) {
    return this.achatService.listerFournisseurs(user.tenantId, recherche);
  }

  @Get("fournisseurs/:id")
  @ApiOperation({ summary: "Obtenir un fournisseur" })
  obtenirFournisseur(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string,
  ) {
    return this.achatService.obtenirFournisseur(user.tenantId, id);
  }

  @Patch("fournisseurs/:id")
  @ApiOperation({ summary: "Modifier un fournisseur" })
  @Roles("ADMIN", "MANAGER", "WAREHOUSE")
  modifierFournisseur(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string,
    @Body() dto: ModifierFournisseurDto,
  ) {
    return this.achatService.modifierFournisseur(user.tenantId, id, dto);
  }

  @Delete("fournisseurs/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Supprimer un fournisseur (soft delete)" })
  @Roles("ADMIN", "MANAGER")
  supprimerFournisseur(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string,
  ) {
    return this.achatService.supprimerFournisseur(user.tenantId, id);
  }

  // ─── Commandes ────────────────────────────────────────────────────────

  @Post("commandes")
  @ApiOperation({ summary: "Créer un bon de commande" })
  @Roles("ADMIN", "MANAGER", "WAREHOUSE")
  creerCommande(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreerCommandeDto,
  ) {
    return this.achatService.creerCommande(user.tenantId, user.userId, dto);
  }

  @Get("commandes")
  @ApiOperation({ summary: "Lister les commandes (filtres statut, fournisseur, emplacement)" })
  listerCommandes(
    @CurrentUser() user: CurrentUserData,
    @Query("statut") statut?: string,
    @Query("fournisseurId") fournisseurId?: string,
    @Query("emplacementId") emplacementId?: string,
  ) {
    return this.achatService.listerCommandes(user.tenantId, {
      statut, fournisseurId, emplacementId,
    });
  }

  @Get("commandes/:id")
  @ApiOperation({ summary: "Obtenir le detail d'une commande avec ses lignes" })
  obtenirCommande(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string,
  ) {
    return this.achatService.obtenirCommande(user.tenantId, id);
  }

  @Patch("commandes/:id/statut")
  @ApiOperation({ summary: "Modifier le statut (DRAFT/SENT/CANCELLED)" })
  @Roles("ADMIN", "MANAGER", "WAREHOUSE")
  modifierStatut(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string,
    @Body() dto: ModifierStatutCommandeDto,
  ) {
    return this.achatService.modifierStatut(user.tenantId, id, dto);
  }

  @Post("commandes/:id/recevoir")
  @ApiOperation({ summary: "Receptionner une commande (totale ou partielle, cree mouvements stock)" })
  @Roles("ADMIN", "MANAGER", "WAREHOUSE")
  recevoir(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string,
    @Body() dto: ReceptionCommandeDto,
  ) {
    return this.achatService.receptionner(user.tenantId, user.userId, id, dto);
  }

  @Post("commandes/:id/envoyer-fournisseur")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Module 10 D3 : envoyer le bon de commande par WhatsApp au fournisseur" })
  @Roles("ADMIN", "MANAGER", "WAREHOUSE")
  envoyerFournisseur(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string,
  ) {
    return this.achatService.envoyerAuFournisseur(user.tenantId, id);
  }

  // ─── Phase A.2 : frais d'approche (Landed Cost) ─────────────────────

  @Get("commandes/:id/frais")
  @ApiOperation({ summary: "Phase A.2 : lister les frais d'approche d'une commande" })
  listerFrais(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string,
  ) {
    return this.achatService.listerFrais(user.tenantId, id);
  }

  @Post("commandes/:id/frais")
  @ApiOperation({ summary: "Phase A.2 : ajouter un frais d'approche (transport, douane, etc.)" })
  @Roles("ADMIN", "MANAGER", "WAREHOUSE")
  ajouterFrais(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string,
    @Body() dto: CreerFraisDto,
  ) {
    return this.achatService.ajouterFrais(user.tenantId, user.userId, id, dto);
  }

  @Patch("commandes/:commandeId/frais/:fraisId")
  @ApiOperation({ summary: "Phase A.2 : modifier un frais d'approche" })
  @Roles("ADMIN", "MANAGER", "WAREHOUSE")
  modifierFrais(
    @CurrentUser() user: CurrentUserData,
    @Param("commandeId") commandeId: string,
    @Param("fraisId") fraisId: string,
    @Body() dto: ModifierFraisDto,
  ) {
    return this.achatService.modifierFrais(user.tenantId, commandeId, fraisId, dto);
  }

  @Delete("commandes/:commandeId/frais/:fraisId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Phase A.2 : supprimer un frais d'approche" })
  @Roles("ADMIN", "MANAGER", "WAREHOUSE")
  supprimerFrais(
    @CurrentUser() user: CurrentUserData,
    @Param("commandeId") commandeId: string,
    @Param("fraisId") fraisId: string,
  ) {
    return this.achatService.supprimerFrais(user.tenantId, commandeId, fraisId);
  }
}
