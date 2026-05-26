import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const BANNER_COLOR_PRESETS = ["pink", "cyan", "yellow", "green"] as const;
export type BannerColorPreset = (typeof BANNER_COLOR_PRESETS)[number];
export interface BannerConfig { colorPreset: BannerColorPreset; }
export const DEFAULT_BANNER_CONFIG: BannerConfig = { colorPreset: "pink" };

function configHome(): string { return process.env.GENTLE_PI_CONFIG_HOME ?? join(homedir(), ".pi", "gentle-ai"); }
export function bannerConfigPath(): string { return join(configHome(), "banner.json"); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function isPreset(value: unknown): value is BannerColorPreset { return typeof value === "string" && BANNER_COLOR_PRESETS.includes(value as BannerColorPreset); }

export function normalizeBannerConfig(value: unknown): BannerConfig {
	if (!isRecord(value)) return { ...DEFAULT_BANNER_CONFIG };
	return {
		colorPreset: isPreset(value.colorPreset) ? value.colorPreset : DEFAULT_BANNER_CONFIG.colorPreset,
	};
}

export function readBannerConfig(): BannerConfig {
	const path = bannerConfigPath();
	if (!existsSync(path)) return { ...DEFAULT_BANNER_CONFIG };
	try { return normalizeBannerConfig(JSON.parse(readFileSync(path, "utf8"))); }
	catch { return { ...DEFAULT_BANNER_CONFIG }; }
}

export async function readBannerConfigAsync(): Promise<BannerConfig> {
	try { return normalizeBannerConfig(JSON.parse(await readFile(bannerConfigPath(), "utf8"))); }
	catch { return { ...DEFAULT_BANNER_CONFIG }; }
}

export function writeBannerConfig(config: BannerConfig): void {
	const path = bannerConfigPath();
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, `${JSON.stringify(normalizeBannerConfig(config), null, 2)}\n`);
}

export async function writeBannerConfigAsync(config: BannerConfig): Promise<void> {
	const path = bannerConfigPath();
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, `${JSON.stringify(normalizeBannerConfig(config), null, 2)}\n`);
}

export function updateBannerConfig(patch: Partial<BannerConfig>): BannerConfig { const next = normalizeBannerConfig({ ...readBannerConfig(), ...patch }); writeBannerConfig(next); return next; }
export async function updateBannerConfigAsync(patch: Partial<BannerConfig>): Promise<BannerConfig> { const next = normalizeBannerConfig({ ...(await readBannerConfigAsync()), ...patch }); await writeBannerConfigAsync(next); return next; }
