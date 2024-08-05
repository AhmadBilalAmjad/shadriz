#!/usr/bin/env node

import { Command } from "commander";
import { log } from "./lib/log";
import { AuthProvider, PkStrategy, SessionStrategy } from "./lib/types";
import { ScaffoldProcessor } from "./processors/scaffold-processor";
import { checkbox, select, confirm } from "@inquirer/prompts";
import { regenerateSchemaIndex, spawnCommand } from "./lib/utils";
import {
  dialectStrategyFactory,
  packageStrategyFactory,
} from "./lib/strategy-factory";
import { AuthProcessor } from "./processors/auth-processor";
import { NewProjectProcessor } from "./processors/new-project-processor";
import { DarkModeProcessor } from "./processors/dark-mode-processor";
import { StripeProcessor } from "./processors/stripe-processor";
import { AdminProcessor } from "./processors/admin-processor";

const program = new Command();

program
  .name("shadriz")
  .description(
    "shadriz - full stack framework next.js shadcn/ui and drizzle orm"
  )
  .version("1.2.0");

program
  .command("new")
  .description(
    "initialize a new next.js project using recommended settings for shadriz"
  )
  .argument("<name>", "name of project")
  .option("--pnpm", "run with pnpm", false)
  .action(async (name, options) => {
    try {
      if (options.pnpm) {
        await spawnCommand(
          `pnpm create next-app ${name} --typescript --eslint --tailwind --app --no-src-dir --no-import-alias`
        );
      } else {
        await spawnCommand(
          `npx create-next-app ${name} --typescript --eslint --tailwind --app --no-src-dir --no-import-alias`
        );
      }
    } catch (error) {}
  });

program
  .command("init")
  .description("initialize project")
  .option("--pnpm", "run with pnpm", false)
  .option("--no-install", "skip installation of dependencies")
  .option("--latest", "install latest version for every dependency")
  .action(async (options) => {
    try {
      let authProcessor;
      let stripeProcessor;
      let stripeEnabled = false;
      let authProviders;
      let authStrategy;
      let pkStrategy;
      let adminEnabled;
      let adminProcessor;
      const dbPackage = await select({
        message: "Which database library would you like to use?",
        choices: [
          { name: "pg", value: "pg" },
          { name: "mysql2", value: "mysql2" },
          { name: "better-sqlite3", value: "better-sqlite3" },
        ],
      });
      const authEnabled = await confirm({
        message: "Do you want to use Auth.js for authentication?",
        default: true,
      });
      if (authEnabled) {
        pkStrategy = await select({
          message:
            "Which primary key generation strategy would you like to use?",
          choices: [
            { name: "uuidv7", value: "uuidv7" },
            { name: "uuidv4", value: "uuidv4" },
          ],
        });
        authProviders = await checkbox({
          message: "Which auth providers would you like to use?",
          choices: [
            { name: "github", value: "github" },
            { name: "google", value: "google" },
            { name: "credentials", value: "credentials" },
            { name: "postmark", value: "postmark" },
            { name: "nodemailer", value: "nodemailer" },
          ],
        });
        authStrategy = await select({
          message: "Which session strategy would you like to use?",
          choices: [
            { name: "jwt", value: "jwt" },
            { name: "database", value: "database" },
          ],
        });
        if (authProviders.includes("credentials") && authStrategy !== "jwt") {
          log.bgRed("jwt is required if credentials is selected");
          process.exit(1);
        }
        adminEnabled = await confirm({
          message:
            "Do you want to add an Admin dashboard with role-based authorization?",
          default: true,
        });
        if (adminEnabled && !authProviders.includes("credentials")) {
          log.bgRed("credentials provider is required for admin dashboard");
          process.exit(1);
        }
        stripeEnabled = await confirm({
          message: "Do you want to enable Stripe for payments?",
        });
      }
      const darkModeEnabled = await confirm({
        message: "Do you want to add a dark mode toggle?",
        default: true,
      });
      const newProjectProcessor = new NewProjectProcessor({
        pnpm: options.pnpm,
        install: options.install,
        latest: options.latest,
        darkMode: darkModeEnabled,
        authEnabled: authEnabled,
        stripeEnabled: stripeEnabled,
      });
      const dbPackageStrategy = packageStrategyFactory(dbPackage, {
        pnpm: options.pnpm,
        install: options.install,
        latest: options.latest,
      });
      const dbDialectStrategy = dialectStrategyFactory(
        dbPackageStrategy.dialect
      );
      if (authEnabled) {
        authProcessor = new AuthProcessor({
          pnpm: options.pnpm,
          providers: authProviders as AuthProvider[],
          sessionStrategy: authStrategy as SessionStrategy,
          install: options.install,
          latest: options.latest,
          stripeEnabled: stripeEnabled,
          pkStrategy: pkStrategy as PkStrategy,
          dbDialectStrategy: dbDialectStrategy,
        });
      }
      if (adminEnabled) {
        adminProcessor = new AdminProcessor({
          pnpm: options.pnpm,
          install: options.install,
          latest: options.latest,
        });
      }
      if (stripeEnabled) {
        stripeProcessor = new StripeProcessor({
          dbDialectStrategy: dbDialectStrategy,
          pnpm: options.pnpm,
          install: options.install,
          latest: options.latest,
          pkStrategy: pkStrategy as PkStrategy,
        });
      }
      await newProjectProcessor.init();
      await dbPackageStrategy.init();
      dbDialectStrategy.init();
      if (darkModeEnabled) {
        const darkModeProcessor = new DarkModeProcessor({
          pnpm: options.pnpm,
          install: options.install,
          latest: options.latest,
        });
        await darkModeProcessor.init();
      }
      if (authProcessor) {
        await authProcessor.init();

        if (adminProcessor) {
          await adminProcessor.init();
        }

        if (stripeProcessor) {
          await stripeProcessor.init();
        }

        regenerateSchemaIndex();
        authProcessor.printCompletionMessage();
        if (adminProcessor) {
          adminProcessor.printCompletionMessage();
        }
        if (stripeProcessor) {
          stripeProcessor.printCompletionMessage();
        }
      } else {
        regenerateSchemaIndex();
      }
    } catch (error) {
      log.bgRed(`${error}`);
    }
  });

program
  .command("scaffold")
  .summary("scaffold crud ui, db schema, migration, and actions")
  .description(
    `Generate CRUD ui, db schema, db migration, and server actions for a table

# postgresql uuid primary key examples:
scaffold post -d postgresql -c id:uuid:pk:default-uuidv7 title:text created_at:timestamp:default-now
scaffold post -d postgresql -c id:uuid:pk:default-uuidv4 title:text created_at:timestamp:default-now

# postgresql auto increment primary key examples:
scaffold post -d postgresql -c id:bigserial:pk title:text created_at:timestamp:default-now
scaffold post -d postgresql -c id:serial:pk title:text created_at:timestamp:default-now

# postgresql foreign key examples:
scaffold post -d postgresql -c id:bigserial:pk title:text
scaffold comment -d postgresql -c id:bigserial:pk post_id:bigint:fk-post.id content:text

# mysql uuid primary key examples:
scaffold post -d mysql -c id:varchar:pk:default-uuidv7 title:varchar created_at:timestamp:default-now
scaffold post -d mysql -c id:varchar:pk:default-uuidv4 title:varchar created_at:timestamp:default-now

# mysql auto increment primary key examples:
scaffold post -d mysql -c id:serial:pk title:varchar created_at:timestamp:default-now
scaffold post -d mysql -c id:integer:pk-auto title:varchar created_at:timestamp:default-now

# mysql foreign key examples:
scaffold post -d mysql -c id:serial:pk title:varchar
scaffold comment -d mysql -c id:serial:pk post_id:bigint:fk-post.id content:text

# sqlite uuid primary key examples:
scaffold post -d sqlite -c id:text:pk:default-uuidv7 title:text created_at:text:default-now
scaffold post -d sqlite -c id:text:pk:default-uuidv4 title:text created_at:text:default-now

# sqlite auto increment primary key examples:
scaffold post -d sqlite -c id:integer:pk-auto title:text created_at:text:default-now

# sqlite foreign key examples:
scaffold post -d sqlite -c id:integer:pk-auto title:text
scaffold post -d sqlite -c id:integer:pk-auto post_id:integer:fk-post.id content:text
`
  )
  .argument("<table>", "table: post, product, order, etc")
  .requiredOption("-d, --dialect <dialect>", "postgresql, mysql, sqlite")
  .requiredOption(
    "-c, --columns <columns...>",
    "column_name:data_type:column-arg1:column-arg2"
  )
  .option(
    "-p, --private",
    "scaffold into app/(private) route group. requires auth to access",
    false
  )
  .action(async (table, options) => {
    const dialectStrategy = dialectStrategyFactory(options.dialect);
    const scaffoldProcessor = new ScaffoldProcessor({
      table: table,
      columns: options.columns,
      dbDialectStrategy: dialectStrategy,
      private: options.private,
    });
    scaffoldProcessor.process();
  });

program.parse();
