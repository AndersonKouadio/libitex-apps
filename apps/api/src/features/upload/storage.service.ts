import { Injectable, Logger, OnModuleInit, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client, PutObjectCommand, CreateBucketCommand, HeadBucketCommand, PutBucketPolicyCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

/**
 * Service de stockage objet S3-compatible (MinIO en dev/prod, AWS S3 possible).
 *
 * Variables d'environnement:
 *   STORAGE_ENDPOINT          ex. http://minio:9000 (interne) ou https://minio.lunion-lab.com (publique)
 *   STORAGE_PUBLIC_ENDPOINT   url publique servie aux clients (defaut = STORAGE_ENDPOINT)
 *   STORAGE_ACCESS_KEY        identifiant
 *   STORAGE_SECRET_KEY        secret
 *   STORAGE_REGION            ex. us-east-1 (defaut)
 *   STORAGE_BUCKET            ex. libitex-public
 */

const TYPES_AUTORISES = new Set([
  "image/png", "image/jpeg", "image/jpg", "image/webp", "image/avif", "image/gif", "image/svg+xml",
]);
const TAILLE_MAX = 5 * 1024 * 1024; // 5 Mo

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicEndpoint: string;
  private readonly disponible: boolean;

  private readonly variablesManquantes: string[];

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>("STORAGE_ENDPOINT");
    const accessKey = this.config.get<string>("STORAGE_ACCESS_KEY");
    const secretKey = this.config.get<string>("STORAGE_SECRET_KEY");
    this.bucket = this.config.get<string>("STORAGE_BUCKET", "libitex-public");
    this.publicEndpoint = this.config.get<string>("STORAGE_PUBLIC_ENDPOINT", endpoint ?? "");

    this.variablesManquantes = [];
    if (!endpoint) this.variablesManquantes.push("STORAGE_ENDPOINT");
    if (!accessKey) this.variablesManquantes.push("STORAGE_ACCESS_KEY");
    if (!secretKey) this.variablesManquantes.push("STORAGE_SECRET_KEY");
    this.disponible = this.variablesManquantes.length === 0;

    this.client = new S3Client({
      endpoint,
      region: this.config.get<string>("STORAGE_REGION", "us-east-1"),
      forcePathStyle: true,
      credentials: accessKey && secretKey
        ? { accessKeyId: accessKey, secretAccessKey: secretKey }
        : undefined,
    });
  }

  async onModuleInit() {
    if (!this.disponible) {
      this.logger.warn(
        `Stockage objet non configure. Variables manquantes: ${this.variablesManquantes.join(", ")}. ` +
          `Ajoutez-les dans le .env du serveur puis redemarrez l'API.`,
      );
      return;
    }
    await this.assurerBucket();
  }

  estDisponible(): boolean {
    return this.disponible;
  }

  async telecharger(params: {
    fichier: Express.Multer.File;
    tenantId: string;
    sousChemin: string;
  }): Promise<{ url: string; cle: string }> {
    if (!this.disponible) {
      throw new BadRequestException(
        `Le service d'upload n'est pas configure sur ce serveur. ` +
          `Variables manquantes : ${this.variablesManquantes.join(", ")}.`,
      );
    }
    const { fichier, tenantId, sousChemin } = params;

    if (!TYPES_AUTORISES.has(fichier.mimetype)) {
      throw new BadRequestException(`Format ${fichier.mimetype} non autorise`);
    }
    if (fichier.size > TAILLE_MAX) {
      throw new BadRequestException(`Fichier trop volumineux (max ${TAILLE_MAX / 1024 / 1024} Mo)`);
    }

    const extension = fichier.originalname.split(".").pop()?.toLowerCase() || "bin";
    const cle = `${sousChemin}/${tenantId}/${randomUUID()}.${extension}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: cle,
        Body: fichier.buffer,
        ContentType: fichier.mimetype,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    return { cle, url: this.urlPublique(cle) };
  }

  private urlPublique(cle: string): string {
    return `${this.publicEndpoint.replace(/\/$/, "")}/${this.bucket}/${cle}`;
  }

  private async assurerBucket() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket ${this.bucket} accessible`);
    } catch {
      this.logger.log(`Bucket ${this.bucket} introuvable, creation...`);
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        const policy = JSON.stringify({
          Version: "2012-10-17",
          Statement: [{
            Sid: "PublicRead",
            Effect: "Allow",
            Principal: "*",
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${this.bucket}/*`],
          }],
        });
        await this.client.send(new PutBucketPolicyCommand({ Bucket: this.bucket, Policy: policy }));
        this.logger.log(`Bucket ${this.bucket} cree avec acces public`);
      } catch (err) {
        this.logger.error(`Echec creation bucket ${this.bucket}`, err instanceof Error ? err.stack : String(err));
      }
    }
  }
}
