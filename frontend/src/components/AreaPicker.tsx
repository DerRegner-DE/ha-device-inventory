import { FLOORS } from "../utils/constants";
import { t } from "../i18n";
import { useLanguage } from "../i18n";

interface AreaPickerProps {
  value: string;
  onChange: (areaId: string, areaName: string) => void;
}

export function AreaPicker({ value, onChange }: AreaPickerProps) {
  useLanguage();
  const handleChange = (e: Event) => {
    const select = e.target as HTMLSelectElement;
    const areaId = select.value;
    if (!areaId) {
      onChange("", "");
      return;
    }
    const option = select.options[select.selectedIndex];
    onChange(areaId, option.text);
  };

  return (
    <select
      value={value}
      onChange={handleChange}
      class="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 focus:border-[#1F4E79] appearance-none"
    >
      <option value="">{t("form.selectArea")}</option>
      {FLOORS.map((floor) => (
        <optgroup key={floor.id} label={floor.name}>
          {floor.areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
