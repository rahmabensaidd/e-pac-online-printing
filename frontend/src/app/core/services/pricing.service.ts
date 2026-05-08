import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface QuoteRequest {
    siren: string | null;
    bindingType: string;
    product: {
        quantity: number;
        productionPage: number;
        height: number;
        width: number;
        thickness: number;
        securityLabel: number;
        hasCoil: number;
        hasInsert: number;
        hasTab: number;
        hasBackcover: number;
        perf: number;
        doubleSidedCover: number;
        shrinkwrap: number;
        threeHoleDrill: number;
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

export interface PricingDriver {
    name: string;
    importance: number | null;
}

export interface PricingModelSummary {
    key: string;
    label: string;
    modelName: string | null;
    prediction: number | null;
    r2: number | null;
    available: boolean | null;
    explanationType: string | null;
}

export interface PricingExplanation {
    selectedSourceKey: string | null;
    selectedSourceLabel: string | null;
    explanationType: string | null;
    formula: string | null;
    shapAvailable: boolean | null;
    clientContext: string | null;
    keyInsights: string[];
    topDrivers: PricingDriver[];
    modelSummaries: PricingModelSummary[];
}

export interface ExplainedQuoteResponse extends QuoteResponse {
    requestId: string | null;
    timestamp: string | null;
    input: unknown;
    explanation: PricingExplanation | null;
}

export interface CopilotAnalyzeRequest {
    siren: string | null;
    bindingType: string;
    product: QuoteRequest['product'];
    selectedQuestion: string;
    conversationHistory: CopilotConversationTurn[];
}

export interface CopilotConversationTurn {
    role: 'copilot' | 'user';
    content: string;
}

export interface CopilotInterpretationResponse {
    answer: string;
    selectedModel: string | null;
    recommendedPrice: number | null;
    confidence: string;
    recommendedAction: string;
}

export interface CopilotAnalyzeResponse {
    selectedQuestion: string;
    pricing: ExplainedQuoteResponse;
    copilot: CopilotInterpretationResponse;
}

@Injectable({ providedIn: 'root' })
export class PricingService {
    private readonly http = inject(HttpClient);

    getQuote(payload: QuoteRequest): Observable<QuoteResponse> {
        return this.http.post<QuoteResponse>('/api/pricing/quote', payload);
    }

    getExplainedQuote(payload: QuoteRequest): Observable<ExplainedQuoteResponse> {
        return this.http.post<ExplainedQuoteResponse>('/api/pricing/quote/explained', payload);
    }

    analyzeWithCopilot(payload: CopilotAnalyzeRequest): Observable<CopilotAnalyzeResponse> {
        return this.http.post<CopilotAnalyzeResponse>('/api/copilot/pricing/analyze', payload);
    }
}
