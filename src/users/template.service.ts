import { Injectable } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';
@Injectable()
export class TemplateService {
  private readonly templatesDir = path.join(__dirname, '../../templates');
  private templateCache = new Map<string, HandlebarsTemplateDelegate>();
  async renderPrompt(name: string, data: any): Promise<string> {
    const templatePath = path.join(this.templatesDir, 'prompts', `${name}.hbs`);
    
    // Check cache
    let template = this.templateCache.get(templatePath);
    
    if (!template) {
      // Load and compile template
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      template = Handlebars.compile(templateContent);
      this.templateCache.set(templatePath, template);
    }
    
    return template(data);
  }
  async renderScript(name: string): Promise<string> {
    const scriptPath = path.join(this.templatesDir, 'scripts', `${name}.js`);
    return fs.readFile(scriptPath, 'utf-8');
  }
}