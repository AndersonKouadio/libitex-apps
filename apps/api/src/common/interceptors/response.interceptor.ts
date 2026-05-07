import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from "@nestjs/common";
import { Observable, map } from "rxjs";

/**
 * Intercepteur global qui enveloppe toutes les reponses dans le format standard.
 * { success: true, data: ... }
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        // Si la reponse a deja le format standard, ne pas re-envelopper
        if (data && typeof data === "object" && "success" in data) {
          return data;
        }
        return { success: true, data };
      }),
    );
  }
}
