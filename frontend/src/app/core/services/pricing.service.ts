import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface QuoteRequest {
    siren: string | null;
    bindingType: string;
    product: {
        // Champs simples
        quantity: number;
        productionPage: number;
        height: number;
        width: number;
        thickness: number;

        // Booléens convertis en Integer (1/0)
        securityLabel: number;
        hasCoil: number;
        hasInsert: number;
        hasTab: number;
        hasBackcover: number;
        perf: number;
        doubleSidedCover: number;
        shrinkwrap: number;
        threeHoleDrill: number;

        // Champs string
        textPaperType: string;
        textColor: string;
        coverPaperType: string;
        coverFinishType: string;
        coverColor: string;
        priorityLevel: string;
        headAndTail: string;
        coilType: string;
        tabColor: string;
        insertPaperType: string;
        caseFinishType: string;
        spineType: string;
        labelType: string;
    };
}

export interface QuoteResponse {
    selectedPrice: number | null;
    selectedModel: string | null;
    selectedStrategy: string | null;
    available: boolean;
    pricingDetails: any;
    message: string;
}

@Injectable({ providedIn: 'root' })
export class PricingService {
    private readonly http = inject(HttpClient);

    getQuote(payload: QuoteRequest): Observable<QuoteResponse> {
        return this.http.post<QuoteResponse>('/api/pricing/quote', payload);
    }
}