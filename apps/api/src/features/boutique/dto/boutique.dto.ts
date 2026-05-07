import { ApiProperty } from "@nestjs/swagger";
import { ActivitySector, ProductType } from "@libitex/shared";

export class BoutiqueDetailDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  nom!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ enum: ActivitySector })
  secteurActivite!: ActivitySector;

  @ApiProperty({ enum: ProductType, isArray: true })
  typesProduitsAutorises!: ProductType[];

  @ApiProperty()
  devise!: string;

  @ApiProperty({ required: false, nullable: true })
  email!: string | null;

  @ApiProperty({ required: false, nullable: true })
  telephone!: string | null;

  @ApiProperty({ required: false, nullable: true })
  adresse!: string | null;
}
