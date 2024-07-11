import { logCmd, logGhost, renderTemplate, spawnCommand } from "./utils";
import path from "path";

interface TemplateToCopy {
  inputPath: string;
  outputPath: string;
}

export class NewProjectProcessor {
  installCommands = [
    "npm install drizzle-orm --legacy-peer-deps",
    "npm install -D drizzle-kit",
    "npm install dotenv",
    "npm install uuidv7",
    "npm install zod",
    "npm install drizzle-zod",
    "npm install @tanstack/react-table",
  ];

  shadcnCommands = [
    "npx shadcn-ui@latest init -y -d",
    "npx shadcn-ui@latest add -y -o table",
    "npx shadcn-ui@latest add -y -o label",
    "npx shadcn-ui@latest add -y -o input",
    "npx shadcn-ui@latest add -y -o button",
    "npx shadcn-ui@latest add -y -o textarea",
  ];

  templatesToCopy: TemplateToCopy[] = [
    {
      inputPath: ".env.local.hbs",
      outputPath: ".env.local",
    },
    {
      inputPath: "lib/config.ts.hbs",
      outputPath: "lib/config.ts",
    },
    {
      inputPath: "components/ui/data-table.tsx.hbs",
      outputPath: "components/ui/data-table.tsx",
    },
  ];

  constructor(public name: string) {}

  async init() {
    await this.createNewProject();
    this.changeDir();
    await this.installDependencies();
    await this.initShadcn();
    this.copyTemplates();
    this.printCompletionMessage();
  }

  async createNewProject() {
    await this.runCommand(
      `npx create-next-app ${this.name} --ts --eslint --tailwind --app --no-src-dir --no-import-alias`
    );
  }

  changeDir() {
    process.chdir(path.resolve(this.name));
  }

  async installDependencies() {
    for (const cmd of this.installCommands) {
      const output = await this.runCommand(cmd);
    }
  }

  copyTemplates() {
    for (const templateToCopy of this.templatesToCopy) {
      renderTemplate({
        inputPath: templateToCopy.inputPath,
        outputPath: templateToCopy.outputPath,
      });
    }
  }

  async initShadcn() {
    for (const cmd of this.shadcnCommands) {
      await this.runCommand(cmd);
    }
  }

  async runCommand(cmd) {
    await spawnCommand(cmd);
  }

  printCompletionMessage() {
    logGhost("\n✅ new project success: " + this.name);
    logGhost("\n👉 recommended next step:");
    logCmd(`cd ${this.name}`);
    logCmd(`npx shadriz db -h`);
  }
}
