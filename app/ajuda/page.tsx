import { HelpGuide } from "@/components/help-guide";
import { CommercialHelpGuide } from "@/components/commercial-help-guide";
import { isCommercialV2Mode } from "@/lib/domain-mode";

export default function HelpPage() {
  return isCommercialV2Mode() ? <CommercialHelpGuide /> : <HelpGuide />;
}
