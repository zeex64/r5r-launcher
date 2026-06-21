import { Globe, Settings } from "lucide-react";
import { ASSETS } from "../../config/assets";
import { Img } from "../ui/media/Img";
import UtilityButton from "../ui/controls/UtilityButton";

type UtilityButtonsProps = {
  onSettings: () => void;
};

export default function UtilityButtons({
  onSettings,
}: UtilityButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      <UtilityButton aria-label="Discord" href="https://discord.com/invite/jqMkUdXrBr">
        <Img src={ASSETS.discord} alt="Discord" className="h-[24px] w-[24px] object-contain" />
      </UtilityButton>

      <UtilityButton aria-label="Website" href="https://r5reloaded.com">
        <Globe size={24} strokeWidth={2} />
      </UtilityButton>

      <UtilityButton aria-label="Settings" onClick={onSettings}>
        <Settings size={24} strokeWidth={2} />
      </UtilityButton>
    </div>
  );
}
