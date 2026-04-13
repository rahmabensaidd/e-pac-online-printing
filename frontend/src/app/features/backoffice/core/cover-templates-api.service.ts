import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, firstValueFrom, of, throwError } from 'rxjs';

export interface CoverTemplateApiModel {
  templateId: number;
  name: string;
  description: string | null;
  family: string;
  sourceBlankCode: string;
  status: 'DRAFT' | 'PUBLISHED' | string;
  sceneString: string;
  thumbnailUrl: string | null;
  metadataJson: string | null;
  createdByAdmin: boolean;
  active: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  creationAuthorId: number | null;
}

export interface CoverTemplateSaveDraftRequest {
  templateId?: number;
  name: string;
  description?: string;
  family: string;
  sourceBlankCode: string;
  sceneString: string;
  thumbnailUrl?: string;
  metadataJson?: string;
}

export interface CoverTemplateUsageApiModel {
  templateId: number;
  linkedToBooks: boolean;
  linkedBooksCount: number;
  canOverwrite: boolean;
}

@Injectable({ providedIn: 'root' })
export class CoverTemplatesApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/cover-templates';

  async saveMyTemplate(userId: number, payload: CoverTemplateSaveDraftRequest): Promise<CoverTemplateApiModel> {
    return await firstValueFrom(
      this.http.post<CoverTemplateApiModel>(`${this.apiUrl}/my/${userId}`, payload),
    );
  }

  async getMyTemplates(userId: number): Promise<CoverTemplateApiModel[]> {
    return await firstValueFrom(
      this.http.get<CoverTemplateApiModel[]>(`${this.apiUrl}/my/${userId}`).pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 404) {
            return of([]);
          }
          return throwError(() => error);
        }),
      ),
    );
  }

  async saveDraft(userId: number, payload: CoverTemplateSaveDraftRequest): Promise<CoverTemplateApiModel> {
    return await firstValueFrom(
      this.http.post<CoverTemplateApiModel>(`${this.apiUrl}/drafts/${userId}`, payload),
    );
  }

  async publish(templateId: number): Promise<CoverTemplateApiModel> {
    return await firstValueFrom(
      this.http.post<CoverTemplateApiModel>(`${this.apiUrl}/${templateId}/publish`, {}),
    );
  }

  async getDraftsByUser(userId: number): Promise<CoverTemplateApiModel[]> {
    return await firstValueFrom(
      this.http.get<CoverTemplateApiModel[]>(`${this.apiUrl}/drafts/user/${userId}`).pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 404) {
            return of([]);
          }
          return throwError(() => error);
        }),
      ),
    );
  }

  async getPublished(): Promise<CoverTemplateApiModel[]> {
    return await firstValueFrom(
      this.http.get<CoverTemplateApiModel[]>(`${this.apiUrl}/published`).pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 404) {
            return of([]);
          }
          return throwError(() => error);
        }),
      ),
    );
  }

  async saveChanges(templateId: number, payload: CoverTemplateSaveDraftRequest): Promise<CoverTemplateApiModel> {
    return await firstValueFrom(
      this.http.put<CoverTemplateApiModel>(`${this.apiUrl}/${templateId}`, payload),
    );
  }

  async getTemplateUsage(templateId: number): Promise<CoverTemplateUsageApiModel> {
    return await firstValueFrom(
      this.http.get<CoverTemplateUsageApiModel>(`${this.apiUrl}/${templateId}/usage`),
    );
  }
}
