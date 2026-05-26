import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { BANNER_COLOR_PRESETS, DEFAULT_BANNER_CONFIG, bannerConfigPath, normalizeBannerConfig, readBannerConfig, updateBannerConfig, writeBannerConfig } from "../lib/banner-config.ts";

async function withConfigHome<T>(fn: (dir: string) => Promise<T> | T): Promise<T> {
	const previous = process.env.GENTLE_PI_CONFIG_HOME;
	const dir = mkdtempSync(join(tmpdir(), "gentle-pi-banner-config-"));
	process.env.GENTLE_PI_CONFIG_HOME = dir;
	try { return await fn(dir); }
	finally {
		if (previous === undefined) delete process.env.GENTLE_PI_CONFIG_HOME;
		else process.env.GENTLE_PI_CONFIG_HOME = previous;
		await rm(dir, { recursive: true, force: true });
	}
}

test("missing banner config returns defaults", async () => withConfigHome(() => {
	assert.deepEqual(readBannerConfig(), DEFAULT_BANNER_CONFIG);
}));

test("normalization falls back for invalid or legacy fields", () => {
	assert.deepEqual(normalizeBannerConfig({ showRose: false, showTextLogo: false, colorPreset: "orange" }), { colorPreset: "pink" });
	assert.deepEqual(normalizeBannerConfig(null), DEFAULT_BANNER_CONFIG);
});

test("supported banner presets are accepted", () => {
	assert.deepEqual([...BANNER_COLOR_PRESETS], ["pink", "cyan", "yellow", "green"]);
	for (const colorPreset of BANNER_COLOR_PRESETS) assert.equal(normalizeBannerConfig({ colorPreset }).colorPreset, colorPreset);
});

test("writeBannerConfig writes normalized JSON to global config home", async () => withConfigHome(async (dir) => {
	writeBannerConfig({ colorPreset: "cyan" });
	assert.equal(bannerConfigPath(), join(dir, "banner.json"));
	assert.deepEqual(JSON.parse(await readFile(join(dir, "banner.json"), "utf8")), { colorPreset: "cyan" });
}));

test("updateBannerConfig merges patches over normalized current config", async () => withConfigHome(() => {
	writeBannerConfig({ colorPreset: "green" });
	const updated = updateBannerConfig({ colorPreset: "yellow" });
	assert.deepEqual(updated, { colorPreset: "yellow" });
	assert.deepEqual(readBannerConfig(), updated);
}));
