import {
  BadRequestException, ForbiddenException, NotFoundException,
  InternalServerErrorException, HttpException, HttpStatus,
} from "@nestjs/common";
import type { ArgumentsHost } from "@nestjs/common";
import { GlobalExceptionFilter } from "./global-exception.filter";
import { Sentry } from "../sentry/sentry";

jest.mock("../sentry/sentry", () => ({
  Sentry: {
    captureException: jest.fn(),
  },
}));

describe("GlobalExceptionFilter", () => {
  let filter: GlobalExceptionFilter;
  let response: { status: jest.Mock; json: jest.Mock };
  let host: ArgumentsHost;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const request = { method: "POST", url: "/api/v1/test" };
    host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;
    jest.clearAllMocks();
  });

  describe("4xx errors (business)", () => {
    it("formate une BadRequestException en 400 avec body success: false", () => {
      const ex = new BadRequestException("Donnees invalides");
      filter.catch(ex, host);

      expect(response.status).toHaveBeenCalledWith(400);
      expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        statusCode: 400,
        path: "/api/v1/test",
      }));
    });

    it("ne remonte PAS les 4xx a Sentry (erreurs metier)", () => {
      filter.catch(new ForbiddenException("Acces refuse"), host);
      filter.catch(new NotFoundException("Resource"), host);
      filter.catch(new BadRequestException("Bad"), host);

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it("preserve les details du HttpException dans le body", () => {
      const ex = new HttpException(
        { error: "ValidationError", details: ["nom requis"] },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
      filter.catch(ex, host);

      expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: "ValidationError",
        details: ["nom requis"],
        statusCode: 422,
      }));
    });
  });

  describe("5xx errors (bugs)", () => {
    it("formate une InternalServerErrorException en 500", () => {
      filter.catch(new InternalServerErrorException(), host);

      expect(response.status).toHaveBeenCalledWith(500);
    });

    it("remonte les 5xx HttpException a Sentry", () => {
      const ex = new InternalServerErrorException("DB down");
      filter.catch(ex, host);

      expect(Sentry.captureException).toHaveBeenCalledWith(ex, {
        tags: { method: "POST", path: "/api/v1/test", status: "500" },
      });
    });

    it("retourne 500 + 'Erreur interne' pour une exception non-HttpException", () => {
      const ex = new Error("Crash imprevu");
      filter.catch(ex, host);

      expect(response.status).toHaveBeenCalledWith(500);
      expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: "Erreur interne du serveur",
        statusCode: 500,
      }));
    });

    it("remonte les exceptions non-HttpException a Sentry", () => {
      const ex = new Error("Crash imprevu");
      filter.catch(ex, host);

      expect(Sentry.captureException).toHaveBeenCalledWith(ex, expect.objectContaining({
        tags: expect.objectContaining({ status: "500" }),
      }));
    });

    it("gere les exceptions non-Error (string, number, etc.)", () => {
      filter.catch("string error", host);

      expect(response.status).toHaveBeenCalledWith(500);
      expect(Sentry.captureException).toHaveBeenCalled();
    });
  });

  describe("Body structure", () => {
    it("inclut toujours timestamp et path", () => {
      filter.catch(new BadRequestException("test"), host);
      const body = response.json.mock.calls[0]?.[0];
      expect(body).toHaveProperty("timestamp");
      expect(body).toHaveProperty("path", "/api/v1/test");
      expect(body).toHaveProperty("statusCode", 400);
    });

    it("timestamp est un ISO string valide", () => {
      filter.catch(new BadRequestException("test"), host);
      const body = response.json.mock.calls[0]?.[0];
      expect(() => new Date(body.timestamp as string).toISOString()).not.toThrow();
    });
  });
});
