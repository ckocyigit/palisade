import { Game, SettingTarget, type SettingsCatalog, type SettingDef } from "@ark/shared";

/**
 * Conan Exiles catalog. The Conan image (acekorneya/conan_enhanced_server) writes
 * ServerSettings.ini / Engine.ini / Game.ini itself from env vars, so every setting
 * here targets `Env` and the runtime spec passes it through (key = env var name).
 *
 * Two kinds of settings:
 *  - First-class: env vars the image's configure-server.sh maps explicitly to an ini
 *    key (e.g. XP_RATE_MULTIPLIER -> PlayerXPRateMultiplier). Built with `cset`.
 *    These are always sent (with our defaults, e.g. Region = North America).
 *  - Raw allowlist: any of the image's ~226 allowed ServerSettings keys, set via
 *    `CONAN_SETTING_<IniKey>`. Built with `rset`. The runtime serializer only sends
 *    these when changed from default, so the game keeps its own vanilla default for
 *    anything the user didn't touch (an approximate default here is harmless).
 *
 * First-class fields handled by the orchestrator (name, passwords, max players,
 * ports, RCON, mods, restarts/updates) are NOT here.
 */
function cset(
  key: string,
  label: string,
  category: string,
  type: SettingDef["type"],
  def: SettingDef["default"],
  extra: Partial<SettingDef> = {},
): SettingDef {
  return { key, label, category, target: SettingTarget.Env, type, default: def, emitAs: key, ...extra };
}

/** A raw ServerSettings.ini key, delivered via the image's CONAN_SETTING_ override
 *  (only sent when the user changes it from the default — see conanCatalogEnv). */
function rset(
  iniKey: string,
  label: string,
  category: string,
  type: SettingDef["type"],
  def: SettingDef["default"],
  extra: Partial<SettingDef> = {},
): SettingDef {
  return cset(iniKey, label, category, type, def, { emitAs: `CONAN_SETTING_${iniKey}`, ...extra });
}

// Common ranges.
const MULT = { min: 0, max: 10, step: 0.1 } as const;
const MULT_WIDE = { min: 0, max: 100, step: 0.1 } as const;

const settings: SettingDef[] = [
  // ── General / browser ──────────────────────────────────────────────────────
  cset("SERVER_MESSAGE_OF_THE_DAY", "Message of the day", "General", "string", "", {
    help: "Shown to players when they join.",
  }),
  cset("SERVER_REGION", "Region", "General", "enum", "1", {
    choices: [
      { value: "0", label: "Europe" },
      { value: "1", label: "North America" },
      { value: "2", label: "Asia" },
      { value: "3", label: "Australia" },
      { value: "4", label: "South America" },
      { value: "5", label: "Japan" },
    ],
    help: "Region the server advertises in the in-game server browser.",
  }),
  cset("COMMUNITY", "Server type", "General", "enum", "0", {
    choices: [
      { value: "0", label: "Purist" },
      { value: "1", label: "Relaxed" },
      { value: "2", label: "Hardcore" },
      { value: "3", label: "Role Playing" },
      { value: "4", label: "Experimental" },
    ],
    help: "Community category shown in the browser.",
  }),
  cset("SERVER_VOICE_CHAT", "In-game voice chat", "General", "enum", "0", {
    choices: [
      { value: "0", label: "Disabled" },
      { value: "1", label: "Enabled" },
    ],
  }),
  rset("ShowOnlinePlayers", "Show online players in browser", "General", "bool", true),
  rset("DisableChatFormatting", "Disable chat formatting", "General", "bool", false),
  rset("AllowFamilySharedAccount", "Allow Steam Family Sharing accounts", "General", "bool", true),
  rset("EnableLoginQueue", "Login queue when full", "General", "bool", false),
  rset("EnableTargetLock", "Allow target lock (soft aim)", "General", "bool", true),
  rset("CreativeModeServer", "Creative mode (admin no-cost build)", "General", "bool", false),
  rset("PoiProtectionEnabled", "Protect points of interest", "General", "bool", true),
  rset("ServerTransferEnabled", "Allow character transfer in/out", "General", "bool", false),
  rset("MaxAllowedPing", "Max allowed ping (0 = no limit)", "General", "int", 0, { min: 0, max: 1000 }),
  rset("KickAFKTime", "Kick AFK players after (seconds, 0 = never)", "General", "int", 0, { min: 0, max: 86400 }),
  rset("DisconnectionGraceTime", "Disconnect grace period (seconds)", "General", "int", 120, { min: 0, max: 3600 }),

  // ── PvP & rules ────────────────────────────────────────────────────────────
  cset("PVP_ENABLED", "PvP enabled", "PvP & Rules", "bool", true),
  cset("CAN_DAMAGE_PLAYER_OWNED_STRUCTURES", "Players can damage structures", "PvP & Rules", "bool", false, {
    help: "Allow building damage (raiding). Forced on while a building-damage schedule is set.",
  }),
  rset("FriendlyFireDamageMultiplier", "Friendly fire damage ×", "PvP & Rules", "float", 1.0, MULT),
  rset("DynamicBuildingDamage", "Dynamic building damage", "PvP & Rules", "bool", false, {
    help: "Buildings only take damage during set periods.",
  }),
  rset("DisableBuildingDuringTimeRestrictedPVP", "Block building during PvP hours", "PvP & Rules", "bool", false),
  rset("bUndermeshDetectionEnabled", "Detect under-mesh exploits", "PvP & Rules", "bool", true),
  cset("ENABLE_BATTLEYE", "BattlEye anti-cheat", "PvP & Rules", "bool", true),
  cset("AVATAR_ENABLED", "Avatars (god summons) enabled", "PvP & Rules", "bool", true),
  cset("MAX_NUDITY", "Max nudity", "PvP & Rules", "enum", "0", {
    choices: [
      { value: "0", label: "None" },
      { value: "1", label: "Partial" },
      { value: "2", label: "Full" },
    ],
  }),

  // ── Combat (damage / health) ───────────────────────────────────────────────
  rset("PlayerDamageMultiplier", "Player damage dealt ×", "Combat", "float", 1.0, MULT),
  rset("PlayerDamageTakenMultiplier", "Player damage taken ×", "Combat", "float", 1.0, MULT),
  rset("NPCDamageMultiplier", "NPC damage dealt ×", "Combat", "float", 1.0, MULT),
  rset("NPCDamageTakenMultiplier", "NPC damage taken ×", "Combat", "float", 1.0, MULT),
  rset("NPCHealthMultiplier", "NPC health ×", "Combat", "float", 1.0, MULT),
  rset("ThrallDamageToPlayersMultiplier", "Thrall damage to players ×", "Combat", "float", 1.0, MULT),
  rset("ThrallDamageToNPCsMultiplier", "Thrall damage to NPCs ×", "Combat", "float", 1.0, MULT),
  rset("MinionDamageMultiplier", "Follower damage dealt ×", "Combat", "float", 1.0, MULT),
  rset("MinionDamageTakenMultiplier", "Follower damage taken ×", "Combat", "float", 1.0, MULT),
  rset("StructureDamageMultiplier", "Structure damage dealt ×", "Combat", "float", 1.0, MULT),
  rset("StructureHealthMultiplier", "Structure health ×", "Combat", "float", 1.0, MULT),
  rset("BuildingDamageMultiplier", "Building damage ×", "Combat", "float", 1.0, MULT),
  rset("PlayerKnockbackMultiplier", "Player knockback ×", "Combat", "float", 1.0, MULT),
  rset("NPCKnockbackMultiplier", "NPC knockback ×", "Combat", "float", 1.0, MULT),
  rset("ConciousnessDamageMultiplier", "Knockout (concussion) damage ×", "Combat", "float", 1.0, MULT),
  rset("PvPMountEnduranceDamageMultiplier", "Mount endurance damage ×", "Combat", "float", 1.0, MULT),

  // ── Survival (player rates) ────────────────────────────────────────────────
  cset("PLAYER_HEALTH_REGEN_SPEED_SCALE", "Health regen speed ×", "Survival", "float", 1.0, MULT),
  cset("PLAYER_STAMINA_COST_MULTIPLIER", "Stamina cost ×", "Survival", "float", 1.0, MULT),
  cset("PLAYER_STAMINA_COST_SPRINT_MULTIPLIER", "Sprint stamina cost ×", "Survival", "float", 1.0, MULT),
  rset("PlayerStaminaRegenSpeedScale", "Stamina regen speed ×", "Survival", "float", 1.0, MULT),
  rset("StaminaStaticRegenRateMultiplier", "Standing stamina regen ×", "Survival", "float", 1.0, MULT),
  rset("StaminaMovingRegenRateMultiplier", "Moving stamina regen ×", "Survival", "float", 1.0, MULT),
  rset("PlayerMovementSpeedScale", "Movement speed ×", "Survival", "float", 1.0, MULT),
  rset("PlayerSprintSpeedScale", "Sprint speed ×", "Survival", "float", 1.0, MULT),
  rset("PlayerEncumbranceMultiplier", "Carry capacity ×", "Survival", "float", 1.0, MULT),
  rset("PlayerEncumbrancePenaltyMultiplier", "Encumbrance penalty ×", "Survival", "float", 1.0, MULT),
  rset("PlayerCorruptionGainMultiplier", "Corruption gain ×", "Survival", "float", 1.0, MULT),
  rset("PlayerCorruptionGainFromSorceryMultiplier", "Sorcery corruption gain ×", "Survival", "float", 1.0, MULT),

  // ── Progression (XP) ───────────────────────────────────────────────────────
  cset("XP_RATE_MULTIPLIER", "Overall XP ×", "Progression", "float", 1.0, MULT_WIDE),
  cset("PLAYER_XP_KILL_MULTIPLIER", "Kill XP ×", "Progression", "float", 1.0, MULT_WIDE),
  cset("PLAYER_XP_HARVEST_MULTIPLIER", "Harvest XP ×", "Progression", "float", 1.0, MULT_WIDE),
  cset("PLAYER_XP_CRAFT_MULTIPLIER", "Crafting XP ×", "Progression", "float", 1.0, MULT_WIDE),
  cset("PLAYER_XP_TIME_MULTIPLIER", "Time (idle) XP ×", "Progression", "float", 1.0, MULT_WIDE),

  // ── Harvest & crafting ─────────────────────────────────────────────────────
  cset("HARVEST_AMOUNT_MULTIPLIER", "Harvest amount ×", "Harvest & Crafting", "float", 1.0, MULT_WIDE),
  cset("ITEM_SPOIL_RATE_SCALE", "Item spoil rate ×", "Harvest & Crafting", "float", 1.0, MULT),
  cset("FUEL_BURN_TIME_MULTIPLIER", "Fuel burn time ×", "Harvest & Crafting", "float", 1.0, MULT),
  cset("CRAFTING_COST_MULTIPLIER", "Crafting cost ×", "Harvest & Crafting", "float", 1.0, MULT),
  rset("ItemConvertionMultiplier", "Crafting/cooking speed ×", "Harvest & Crafting", "float", 1.0, MULT),
  rset("AnimalPenCraftingTimeMultiplier", "Animal pen time ×", "Harvest & Crafting", "float", 1.0, MULT),
  rset("FeedBoxRangeMultiplier", "Feed box range ×", "Harvest & Crafting", "float", 1.0, MULT),

  // ── World (time / spawns) ──────────────────────────────────────────────────
  cset("DAY_CYCLE_SPEED_SCALE", "Day cycle speed ×", "World", "float", 1.0, MULT),
  cset("DAY_TIME_SPEED_SCALE", "Daytime speed ×", "World", "float", 1.0, MULT),
  cset("NIGHT_TIME_SPEED_SCALE", "Nighttime speed ×", "World", "float", 1.0, MULT),
  cset("NPC_RESPAWN_MULTIPLIER", "NPC respawn ×", "World", "float", 1.0, MULT),
  rset("NPCMaxSpawnCapMultiplier", "NPC spawn cap ×", "World", "float", 1.0, MULT),
  rset("AmbientLifeEnabled", "Ambient wildlife", "World", "bool", true),
  rset("EventSystemEnabled", "World events / purge", "World", "bool", true),
  rset("EnableFatalities", "Fatalities (finisher kills)", "World", "bool", true),
  rset("DogsOfTheDesertSpawnWithDogs", "Dogs of the Desert spawn with dogs", "World", "bool", true),

  // ── Death ──────────────────────────────────────────────────────────────────
  cset("DROP_EQUIPMENT_ON_DEATH", "Drop equipment on death", "Death", "enum", "1", {
    choices: [
      { value: "0", label: "Nothing" },
      { value: "1", label: "Everything" },
      { value: "2", label: "All but equipped" },
    ],
  }),
  cset("DROP_BACKPACK_ON_DEATH", "Drop backpack on death", "Death", "enum", "1", {
    choices: [
      { value: "0", label: "Nothing" },
      { value: "1", label: "Everything" },
      { value: "2", label: "All but equipped" },
    ],
  }),
  cset("EVERYBODY_CAN_LOOT_CORPSE", "Anyone can loot corpses", "Death", "bool", true),
  rset("CorpsesPerPlayer", "Corpses kept per player", "Death", "int", 5, { min: 1, max: 20 }),
  rset("MaxDeathMapMarkers", "Death map markers kept", "Death", "int", 5, { min: 0, max: 50 }),

  // ── Building ───────────────────────────────────────────────────────────────
  cset("ALLOW_BUILDING_ANYWHERE", "Allow building anywhere", "Building", "bool", false),
  cset("BUILDING_ABANDONMENT_ENABLED", "Building abandonment (decay)", "Building", "bool", true),
  rset("BuildingPickupEnabled", "Allow building pickup", "Building", "bool", true),
  rset("StabilityLossMultiplier", "Stability loss ×", "Building", "float", 1.0, MULT),
  rset("LandClaimRadiusMultiplier", "Land-claim radius ×", "Building", "float", 1.0, MULT),
  rset("BuildingDecayTimeMultiplier", "Building decay time ×", "Building", "float", 1.0, MULT),
  rset("DecayCleanupTimeMultiplier", "Ruined-building cleanup time ×", "Building", "float", 1.0, MULT),
  rset("DecayShowBuildingScore", "Show decay timer on buildings", "Building", "bool", false),
  rset("DisableLandclaimNotifications", "Hide land-claim notifications", "Building", "bool", false),
  rset("CampsIgnoreLandclaim", "Camps ignore land claim", "Building", "bool", false),
  rset("ContainersIgnoreOwnership", "Containers ignore ownership", "Building", "bool", false),

  // ── Clans ──────────────────────────────────────────────────────────────────
  cset("CLAN_MAX_SIZE", "Max clan size", "Clans", "int", 10, { min: 1, max: 100 }),
  rset("EnableClanMarkers", "Clan map markers", "Clans", "bool", true),

  // ── Thralls & followers ────────────────────────────────────────────────────
  cset("THRALL_CONVERSION_MULTIPLIER", "Thrall conversion speed ×", "Thralls", "float", 0.5, MULT),
  rset("ThrallCorruptionRemovalMultiplier", "Thrall corruption removal ×", "Thralls", "float", 1.0, MULT),
  rset("DisableThrallDecay", "Disable thrall/pet decay", "Thralls", "bool", false),
  rset("UseMinionPopulationLimit", "Limit follower population", "Thralls", "bool", false),
  rset("MinionPopulationBaseValue", "Base follower limit", "Thralls", "int", 50, { min: 0, max: 1000 }),
  rset("MinionPopulationPerPlayer", "Extra follower limit per player", "Thralls", "int", 0, { min: 0, max: 1000 }),
  rset("MinionOverpopulationCleanup", "Auto-clean excess followers", "Thralls", "bool", false),
  rset("EnableFollowerDbno", "Followers down-but-not-out", "Thralls", "bool", false, {
    help: "Followers fall unconscious instead of dying.",
  }),
  rset("EnableFollowerRescueOnLandClaimOnly", "Rescue followers only on your claim", "Thralls", "bool", false),

  // ── Avatars ────────────────────────────────────────────────────────────────
  rset("AvatarDomeDamageMultiplier", "Avatar dome damage ×", "Avatars", "float", 1.0, MULT),
  rset("AvatarDomeDurationMultiplier", "Avatar dome duration ×", "Avatars", "float", 1.0, MULT),

  // ── Schedules (leave blank for unrestricted) ───────────────────────────────
  // Day list (e.g. "Saturday,Sunday" or "weekend"/"weekday") + HH:MM start/end, in
  // the server's timezone. The image converts these to the per-day ini windows.
  cset("PVP_TIME_DAYS", "PvP days", "Schedules", "string", "", {
    help: 'When PvP is allowed. Days like "Saturday,Sunday" or "weekend". Blank = always.',
  }),
  cset("PVP_TIME_START", "PvP start (HH:MM)", "Schedules", "string", ""),
  cset("PVP_TIME_END", "PvP end (HH:MM)", "Schedules", "string", ""),
  cset("PVP_BUILDING_DAMAGE_DAYS", "Raid (building damage) days", "Schedules", "string", "", {
    help: 'When buildings can be damaged. Days like "Friday,Saturday". Blank = follows PvP.',
  }),
  cset("PVP_BUILDING_DAMAGE_START", "Raid start (HH:MM)", "Schedules", "string", ""),
  cset("PVP_BUILDING_DAMAGE_END", "Raid end (HH:MM)", "Schedules", "string", ""),
];

export const CONAN_CATALOG: SettingsCatalog = { game: Game.CONAN, version: "3", settings };
