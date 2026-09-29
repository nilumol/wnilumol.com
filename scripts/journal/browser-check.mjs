/** Local-only fixture checks. Creates a temporary route, never reads Blob or submits saves. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import puppeteer from 'puppeteer-core';

const root = new URL('../../', import.meta.url);
const fixture = new URL('app/journal/calendar-browser-fixture/', root);
const evidence = new URL('.next/journal-browser-evidence/', root);
const entries = [
  { pathname: 'fixture/a', body: 'After UTC midnight', createdAt: '2024-03-01T00:30:00.000Z' },
  { pathname: 'fixture/b', body: 'Leap day afternoon', createdAt: '2024-02-29T20:00:00.000Z' },
  { pathname: 'fixture/c', body: 'Before Pacific midnight', createdAt: '2024-02-29T07:30:00.000Z' },
  { pathname: 'fixture/d', body: 'Year boundary', createdAt: '2024-01-01T00:30:00.000Z' },
];
const nextEnvPath = new URL('next-env.d.ts', root);
const originalNextEnv = await readFile(nextEnvPath);
let server;
let browser;
let createdFixture = false;
let logs = '';
try {
  // Refuse to overwrite an existing route; all fixture data stays out of production builds.
  await mkdir(fixture);
  createdFixture = true;
  await writeFile(new URL('page.tsx', fixture), `
import { JournalComposer } from '../JournalComposer';
import { JournalEntryList } from '../JournalEntryList';
export const dynamic = 'force-dynamic';
export default async function Fixture({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  return <main className="journal-shell"><JournalComposer /><JournalEntryList
    entries={mode === 'empty' || mode === 'failed' ? [] : ${JSON.stringify(entries)}}
    unreadableCount={mode === 'partial' ? 1 : 0} listFailed={mode === 'failed' || mode === 'failed-with-entries'}
  /></main>;
}
`);
  const portProbe = net.createServer();
  portProbe.listen(0, '127.0.0.1');
  await once(portProbe, 'listening');
  const port = portProbe.address().port;
  await new Promise(resolve => portProbe.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: root, env: { ...process.env, JOURNAL_READ_WRITE_TOKEN: '', NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', chunk => { logs += chunk; });
  server.stderr.on('data', chunk => { logs += chunk; });
  const url = `${origin}/journal/calendar-browser-fixture`;
  let ready = false;
  for (let i = 0; i < 120; i++) {
    if (server.exitCode !== null) throw new Error(logs);
    try { if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) { ready = true; break; } } catch {}
    await delay(500);
  }
  assert.ok(ready, `Fixture server failed to start: ${logs}`);
  browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  await mkdir(evidence, { recursive: true });
  for (const timezone of ['America/Los_Angeles', 'Asia/Tokyo']) {
    for (const width of [1280, 375, 320]) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      await page.setViewport({ width, height: 900 });
      await page.emulateTimezone(timezone);
      await page.evaluateOnNewDocument(() => {
        const RealDate = Date;
        globalThis.Date = class extends RealDate {
          constructor(...args) { super(...(args.length ? args : ['2024-02-29T12:00:00.000Z'])); }
          static now() { return new RealDate('2024-02-29T12:00:00.000Z').getTime(); }
        };
      });
      // Block all non-local requests and POSTs, including accidental save submissions.
      await page.setRequestInterception(true);
      page.on('request', request => {
        if (!request.url().startsWith(origin) || request.method() !== 'GET') void request.abort();
        else void request.continue();
      });
      const open = async (mode = '') => {
        await page.goto(`${url}${mode ? `?mode=${mode}` : ''}`, { waitUntil: 'networkidle0' });
        await page.waitForFunction(() => document.querySelector('#journal-date-heading')?.textContent.includes('2024'));
      };
      const bodies = () => page.$$eval('.journal-entry-body', nodes => nodes.map(node => node.textContent));
      const day = number => `.journal-calendar-day[aria-label*="February ${number}, 2024"]`;
      const button = text => `::-p-text(${text})`;
      const month = expected => page.waitForFunction(value => document.querySelector('.journal-calendar-toolbar h2')?.textContent === value, {}, expected);
      const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll('.journal-calendar, .journal-calendar-grid, .journal-calendar-footer')].every(node => node.scrollWidth <= node.clientWidth)), `${timezone}/${width}: overflow ${JSON.stringify(await page.evaluate(() => [...document.querySelectorAll(".journal-calendar, .journal-calendar-grid, .journal-calendar-day")].slice(0, 4).map(node => ({ class: node.className, client: node.clientWidth, scroll: node.scrollWidth, width: node.getBoundingClientRect().width }))))}`);
      await open();
      assert.deepEqual(await bodies(), entries.map(entry => entry.body));
      assert.match(await page.$eval('meta[name="robots"]', node => node.content), /noindex, nofollow/);
      await page.type('textarea', 'Unsaved fixture draft');
      await month('February 2024');
      assert.equal(await page.$$eval('.journal-calendar-day', nodes => nodes.length), 29);
      await page.click(day(29));
      const expected = timezone === 'America/Los_Angeles' ? [entries[0].body, entries[1].body] : [entries[2].body];
      assert.deepEqual(await bodies(), expected);
      assert.match(await page.$eval(day(29), node => node.getAttribute('aria-label')), new RegExp(`${expected.length} entr`));
      assert.equal(await page.$eval(day(29), node => node.getAttribute('aria-pressed')), 'true');
      await page.screenshot({ path: new URL(`${timezone.split('/')[1]}-${width}.png`, evidence).pathname, fullPage: true });
      await noOverflow();
      await page.click(day(27));
      assert.equal(await page.$eval('.journal-empty', node => node.textContent), 'No entries for this day.');
      // Tab navigation and native Enter/Space activation exercise real keyboard behavior.
      await page.focus('[aria-label="Previous month"]');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Next month');
      await page.keyboard.press('Enter');
      await month('March 2024');
      await page.focus('[aria-label="Previous month"]');
      await page.keyboard.press('Space');
      await month('February 2024');
      await page.click('[aria-label="Previous month"]');
      await month('January 2024');
      await page.click('[aria-label="Previous month"]');
      await month('December 2023');
      await page.click('[aria-label="Next month"]');
      await month('January 2024');
      await page.click('.journal-calendar-actions ' + button('Today'));
      await month('February 2024');
      assert.deepEqual(await bodies(), expected);
      assert.equal(await page.$eval(day(29), node => node.getAttribute('aria-current')), 'date');
      await page.focus(day(28));
      await page.keyboard.press('Enter');
      assert.deepEqual(await bodies(), timezone === 'America/Los_Angeles' ? [entries[2].body] : []);
      await page.click(button('All entries'));
      assert.deepEqual(await bodies(), entries.map(entry => entry.body));
      assert.equal(await page.$eval('textarea', node => node.value), 'Unsaved fixture draft');
      await noOverflow();
      await open('partial');
      assert.match(await page.$eval('.journal-error', node => node.textContent), /One past entry couldn't be loaded/);
      await page.click(day(29));
      assert.ok(await page.$('.journal-error'));
      await open('empty');
      assert.match(await page.$eval('.journal-empty', node => node.textContent), /Nothing written yet/);
      await page.click(day(27));
      assert.match(await page.$eval('.journal-empty', node => node.textContent), /No entries for this day/);
      for (const mode of ['failed', 'failed-with-entries']) {
        await open(mode);
        const failureState = async () => {
          assert.match(await page.$eval('.journal-error', node => node.textContent), /Past entries couldn't be loaded/);
          assert.match(await page.$eval('.journal-calendar-footer .journal-calendar-note', node => node.textContent), /Entry counts are unavailable/);
          assert.ok(await page.$('textarea'));
          assert.deepEqual(await bodies(), []);
          assert.equal(await page.$('.journal-empty'), null);
          assert.equal(await page.$('.has-entries'), null);
          assert.equal(await page.$('#journal-day-entries .journal-calendar-note'), null);
          assert.ok(await page.$$eval('.journal-calendar-day', nodes => nodes.length > 0 && nodes.every(node => node.getAttribute('aria-label').endsWith(', 0 entries'))));
        };
        await month('February 2024');
        await failureState();
        await page.focus('[aria-label="Previous month"]');
        await page.keyboard.press('Enter');
        await month('January 2024');
        await failureState();
        await page.focus('[aria-label="Next month"]');
        await page.keyboard.press('Space');
        await month('February 2024');
        await page.click(day(29));
        assert.equal(await page.$eval(day(29), node => node.getAttribute('aria-pressed')), 'true');
        await failureState();
        await page.click('[aria-label="Next month"]');
        await month('March 2024');
        await page.click('.journal-calendar-actions ' + button('Today'));
        await month('February 2024');
        await failureState();
        await page.click(button('All entries'));
        await failureState();
        await noOverflow();
        await page.screenshot({ path: new URL(`${timezone.split('/')[1]}-${width}-${mode}.png`, evidence).pathname, fullPage: true });
      }
      assert.deepEqual(errors, [], `${timezone}/${width}: browser errors`);
      console.log(`PASS ${timezone} ${width}px: hydration, filters, counts, leap day, year navigation, Today/All, keyboard, draft preservation, read failures, no overflow`);
      await page.close();
    }
  }
} finally {
  if (browser) await browser.close();
  if (server && server.exitCode === null) {
    const exited = once(server, 'exit');
    server.kill('SIGTERM');
    const timeout = setTimeout(() => server.kill('SIGKILL'), 5000);
    await exited;
    clearTimeout(timeout);
  }
  if (createdFixture) {
    await rm(fixture, { recursive: true, force: true });
    // Next includes dev route validators in production type checking; drop stale fixture types.
    await rm(new URL(".next/dev/types/", root), { recursive: true, force: true });
    await writeFile(nextEnvPath, originalNextEnv);
  }
}
