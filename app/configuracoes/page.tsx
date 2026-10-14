import { SettingsForm } from "@/components/settings-form";
import { CommercialSettingsWorkspace } from "@/components/commercial-settings";
import { isCommercialV2Mode } from "@/lib/domain-mode";
export default function Page() { return isCommercialV2Mode() ? <CommercialSettingsWorkspace /> : <SettingsForm />; }
