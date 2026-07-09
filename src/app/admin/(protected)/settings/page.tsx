import { getSettings } from "../actions";
import SettingsForm from "./settings-form";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <>
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-medium mb-2">
          [settings]
        </p>
        <h2 className="text-xl font-heading font-semibold tracking-tight">
          Pengaturan Studio
        </h2>
      </div>
      <SettingsForm settings={settings} />
    </>
  );
}
