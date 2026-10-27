import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";

test("the Projects card opens the published Halsey article", async () => {
  const projectsResponse = await fetch(new URL("/projects", baseUrl));
  assert.equal(projectsResponse.status, 200);

  const projectsHtml = await projectsResponse.text();
  const cards = [...projectsHtml.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
  const halseyCard = cards.find(([, , body]) =>
    /<h2>Halsey: my AI chief of staff<\/h2>/.test(body),
  );
  assert.ok(halseyCard, "Halsey appears as a project card");

  const href = halseyCard[1].match(/\bhref="([^"]+)"/)?.[1];
  assert.equal(href, "/halsey-intro");

  const articleResponse = await fetch(new URL(href, baseUrl));
  assert.equal(articleResponse.status, 200);
  assert.match(articleResponse.headers.get("content-type") ?? "", /text\/html/);
  assert.match(
    await articleResponse.text(),
    /<h1>Halsey: my AI chief of staff<\/h1>/,
  );
});
