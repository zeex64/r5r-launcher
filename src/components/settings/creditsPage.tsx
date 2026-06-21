import { Group, Row } from "../ui/Controls";

type CreditEntry = {
  name: string;
  role?: string;
};

const LAUNCHER_CREDITS: CreditEntry[] = [{ name: "zee_x64", role: "Launcher Creator" }];

const R5R_CREDITS: CreditEntry[] = [
  { name: "Kawe Mazidjatari", role: "Founder, Lead Engineer" },
  { name: "IcePixel" },
  { name: "Rexx", role: "Master Server, SDK, Scripts" },
  { name: "Sal", role: "Master Server" },
  { name: "zee_x64", role: "Master Server, Scripts, Website" },
  { name: "Mkos", role: "Framework Engineer" },
  { name: "Robotic", role: "SDK, Scripts" },
  { name: "Mostly Fireproof", role: "Scripts" },
  { name: "ReGlitched", role: "Scripts, Maps, Tools" },
  { name: "Julefox", role: "Scripts, Tools" },
  { name: "HumanSAS", role: "3D Artist, Designer" },
  { name: "MackTheBoatMan", role: "Weapons Artist" },
  { name: "LorryLeKral", role: "Scripts, Maps, Assets" },
  { name: "#samlsop", role: "Assets" },
  { name: "Neeflow", role: "Scripts" },
  { name: "CafeFPS", role: "Scripts" },
];

function CreditRole({ children }: { children?: string }) {
  return (
    <div className="flex h-9 items-center justify-end font-ui text-[15px] text-white/76">
      {children ?? ""}
    </div>
  );
}

function CreditRows({ entries }: { entries: CreditEntry[] }) {
  return entries.map(({ name, role }) => (
    <Row key={name} label={name}>
      <CreditRole>{role}</CreditRole>
    </Row>
  ));
}

export default function SettingsCreditsPage() {
  return (
    <>
      <Group title="Launcher Credits">
        <CreditRows entries={LAUNCHER_CREDITS} />
      </Group>

      <Group title="R5Reloaded Credits">
        <CreditRows entries={R5R_CREDITS} />
      </Group>
    </>
  );
}
