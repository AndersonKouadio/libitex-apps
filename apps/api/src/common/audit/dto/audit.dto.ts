import { ApiProperty } from "@nestjs/swagger";

export class AuditLogResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ example: "TICKET_VOIDED" })
  action!: string;

  @ApiProperty({ example: "TICKET" })
  entityType!: string;

  @ApiProperty({ required: false })
  entityId!: string | null;

  @ApiProperty({ required: false, description: "Etat de l'entite avant l'action (JSONB)" })
  before!: unknown;

  @ApiProperty({ required: false, description: "Etat de l'entite apres l'action (JSONB)" })
  after!: unknown;

  @ApiProperty({ required: false })
  ip!: string | null;

  @ApiProperty()
  creeLe!: string;
}
