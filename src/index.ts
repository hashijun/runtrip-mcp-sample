import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import puppeteer from "puppeteer";

// Create server instance
const server = new McpServer({
  name: "runtrip-mcp",
  version: "1.0.0",
});

// Puppeteerを使ってRuntripのコース情報を取得する処理を実装
const fetchRuntripCourse = async (keyword: string, routeType: number, distanceMin: number, distanceMax: number) => {
  const encodedKeyword = encodeURIComponent(keyword);
  const url = `https://runtrip.jp/courses/kanagawa?query=${encodedKeyword}&routeType=${routeType}&distanceMin=${distanceMin}&distanceMax=${distanceMax}`;

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  // データを article タグ単位で抽出
  const results = await page.evaluate(() => {
    const articles = Array.from(document.querySelectorAll('article'));

    return articles.map(article => {
      const image = article.querySelector('img')?.getAttribute('src') || '';
      const pagePath = article.querySelector('a')?.getAttribute('href') || '';
      const url = `https://runtrip.jp${pagePath}`;
      const title = article.querySelector('h2')?.textContent?.trim() || '';

      const description = article.querySelector('p')?.textContent?.trim() || '';

      return {
        image: image,
        title: title,
        description: description,
        url: url
      };
    });
  });

  await browser.close();

  return results;
};

// RuntripへGETリクエストを送り得られたコースの一覧をスクレイピングして返す
// サンプルのため今回は神奈川県内限定にする
server.tool(
  "get-kanagawa-runtrip-course",
  "Runtripから神奈川県のランニングコースを取得",
  {
    keyword: z.string().describe("Search keyword for Runtrip courses in Kanagawa prefecture"),
    routeCategory: z.enum(["往復", "周回", "片道"]).describe("Type of route to search for"),
    distanceMin: z.number().describe("Minimum distance in meters"),
    distanceMax: z.number().describe("Maximum distance in meters")
  },
  async ({ keyword, routeCategory, distanceMin, distanceMax }) => {
    const routeCategories = ["往復", "周回", "片道"];
    const routeType = routeCategories.indexOf(routeCategory) + 1; // 1: 往復, 2: 周回, 3: 片道

    const courses = await fetchRuntripCourse(keyword, routeType, distanceMin, distanceMax);

    // coursesの中からランダムに1コースを選択
    if (courses.length === 0) {
      return { content: [{ type: 'text', text: 'No courses found.' }] };
    } else {
      const randomCourse = courses[Math.floor(Math.random() * courses.length)];
      return {
        content: [
          { type: 'text', text: `Course found:\ntitle: ${randomCourse.title}\ndescription: ${randomCourse.description}\nurl: ${randomCourse.url}\nthumbnail: ${randomCourse.image}` },
        ]
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Runtrip MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
