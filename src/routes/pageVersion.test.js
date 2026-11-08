import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'));

describe('Application Version Banner', () => {
	it('defines __APP_VERSION__ matching package.json', () => {
		expect(__APP_VERSION__).toBe(pkg.version);
	});

	it('uses dynamic __APP_VERSION__ in dashboard hero banner', () => {
		const pageContent = readFileSync(resolve(process.cwd(), 'src/routes/+page.svelte'), 'utf-8');
		expect(pageContent).toContain('Panel de control administrativo · v{__APP_VERSION__}');
		expect(pageContent).not.toMatch(/Panel de control administrativo · [Vv]1\.0\.0/);
	});
});
