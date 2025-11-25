import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { Browser, Page } from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';
@Injectable()
export class BrowserService implements OnModuleInit {
  private readonly logger = new Logger(BrowserService.name);
  private browser: Browser;
  private screenshotDir = './tmp/browser';
  async onModuleInit() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    // Ensure screenshot directory exists
    await fs.mkdir(this.screenshotDir, { recursive: true });
    this.logger.log('Browser initialized');
  }
  async getContent(url: string): Promise<{ content: string; screenshot: string }> {
    this.logger.log(`Fetching content from ${url}`);
    const page = await this.browser.newPage();
    try {
      // Block unnecessary resources
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const resourceType = request.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          request.abort();
        } else {
          request.continue();
        }
      });
      // Navigate to URL
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      const script = await this.templateService.renderScript('content');
      const content = await page.evaluate(script);
      // Extract text content
  
      // Take screenshot
      const screenshot = await page.screenshot({ fullPage: false });
      const screenshotName = await this.saveScreenshot(screenshot);
      return {
        content,
        screenshot: screenshotName,
      };
    } finally {
      await page.close();
    }
  }
  async getUrls(url: string): Promise<{ urls: string; screenshot: string }> {
    this.logger.log(`Fetching URLs from ${url}`);
    const page = await this.browser.newPage();
    try {
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });
      // Extract all URLs
      const urls = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href]'));
        return links
          .map(link => (link as HTMLAnchorElement).href)
          .filter(href => href.startsWith('http'))
          .join('\n');
      });
      // Take screenshot
      const screenshot = await page.screenshot({ fullPage: true });
      const screenshotName = await this.saveScreenshot(screenshot);
      return {
        urls,
        screenshot: screenshotName,
      };
    } finally {
      await page.close();
    }
  }
  private async saveScreenshot(buffer: Buffer): Promise<string> {
    const filename = `${new Date().toISOString().replace(/:/g, '-')}.png`;
    const filepath = path.join(this.screenshotDir, filename);
    
    await fs.writeFile(filepath, buffer);
    
    return filename;
  }
  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
      this.logger.log('Browser closed');
    }
  }
}