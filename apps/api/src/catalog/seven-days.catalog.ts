import { Game, SettingTarget, type SettingsCatalog, type SettingDef } from "@ark/shared";

/**
 * 7 Days to Die catalog. Unlike the env-driven images, 7DTD's settings live in
 * sdtdserver.xml — the runtime spec renders that file from these settings (key = the
 * XML <property name="..."> attribute). First-class fields the orchestrator owns
 * (server name, passwords, ports, telnet, max players, GameWorld from the map) are
 * NOT here. Values are written verbatim into the XML.
 */
function sset(
  key: string,
  label: string,
  category: string,
  type: SettingDef["type"],
  def: SettingDef["default"],
  extra: Partial<SettingDef> = {},
): SettingDef {
  return { key, label, category, target: SettingTarget.Env, type, default: def, emitAs: key, ...extra };
}

const settings: SettingDef[] = [
  // ── World ────────────────────────────────────────────────────────────────────
  sset("GameName", "World save name", "World", "string", "ManagerWorld", {
    help: "Names the save game. For a Random World it also seeds generation; keep it stable to keep the same world.",
  }),
  sset("GameDifficulty", "Difficulty", "World", "enum", "2", {
    choices: [
      { value: "0", label: "Scavenger (easiest)" },
      { value: "1", label: "Adventurer" },
      { value: "2", label: "Nomad (default)" },
      { value: "3", label: "Warrior" },
      { value: "4", label: "Survivalist" },
      { value: "5", label: "Insane (hardest)" },
    ],
    help: "Combat difficulty (damage taken/dealt).",
  }),
  sset("DayLightLength", "Daylight hours", "World", "int", 18, {
    min: 0,
    max: 24,
    unit: "hrs",
    help: "How many of the 24 in-game hours are daylight.",
  }),
  sset("BloodMoonFrequency", "Blood Moon frequency", "World", "int", 7, {
    min: 0,
    max: 30,
    unit: "days",
    help: "Days between horde nights (0 disables them).",
  }),

  // ── Gameplay ─────────────────────────────────────────────────────────────────
  sset("DropOnDeath", "Drop on death", "Gameplay", "enum", "1", {
    choices: [
      { value: "0", label: "Nothing" },
      { value: "1", label: "Everything" },
      { value: "2", label: "Toolbelt only" },
      { value: "3", label: "Backpack only" },
      { value: "4", label: "Delete all" },
    ],
    help: "What a player drops when they die.",
  }),
  sset("PlayerKillingMode", "PvP", "Gameplay", "enum", "3", {
    choices: [
      { value: "0", label: "No killing" },
      { value: "1", label: "Allies only" },
      { value: "2", label: "Strangers only" },
      { value: "3", label: "Everyone (PvP)" },
    ],
    help: "Who players are allowed to kill.",
  }),
  sset("BuildCreate", "Creative menu (cheat)", "Gameplay", "bool", false, {
    help: "Enable the creative menu / debug build access.",
  }),
  sset("LandClaimCount", "Land claims per player", "Gameplay", "int", 3, {
    min: 1,
    max: 50,
    help: "How many land-claim blocks each player may place.",
  }),

  // ── Rates ────────────────────────────────────────────────────────────────────
  sset("LootAbundance", "Loot abundance", "Rates", "int", 100, {
    min: 0,
    max: 600,
    unit: "%",
    help: "Amount of loot found in containers.",
  }),
  sset("XPMultiplier", "XP multiplier", "Rates", "int", 100, {
    min: 1,
    max: 600,
    unit: "%",
    help: "Experience gain rate.",
  }),
];

export const SEVEN_DAYS_CATALOG: SettingsCatalog = { game: Game.SEVEN_DAYS, version: "1", settings };
