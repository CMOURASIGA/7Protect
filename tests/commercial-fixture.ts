import { listCommercialParameters } from "@/application/commercial-parameters-service";
import { saveProspectQualification, type QualificationInput } from "@/application/market-base-service";
import { QUALIFICATION_FIELDS } from "@/domains/commercial/qualification";
export async function completeQualificationInput(): Promise<QualificationInput> {
  const options = await listCommercialParameters();
  const input: QualificationInput = { status: "qualified", profession: "Engenheiro", originDate: "2026-10-08", estimatedMonthlyIncome: 9000 };
  for (const [field, group] of QUALIFICATION_FIELDS) input[field] = options.find((item) => item.group === group && item.active)!.id;
  return input;
}
export async function qualifyFully(id: string) { return saveProspectQualification(id, await completeQualificationInput()); }
