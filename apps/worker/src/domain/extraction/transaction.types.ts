export interface ExtractedTransaction {
  docNo: string | null;
  executionDate: string | null;
  registrationDate: string | null;
  nature: string | null;
  considerationValue: string | null;
  marketValue: string | null;
  surveyNumbers: string[];
  plotNumber: string | null;
  extent: string | null;
  buyerName: string | null;
  sellerName: string | null;
}