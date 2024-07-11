import { Command } from "commander";
import chalk from "chalk";
import { PgPackageStrategy } from "./db-packages/pg-package-strategy";
import { BetterSqlite3PackageStrategy } from "./db-packages/better-sqlite3-package-strategy";
import { PostgresqlDialectStrategy } from "./db-dialects/postgresql-dialect-strategy";
import { SqliteDialectStrategy } from "./db-dialects/sqlite-dialect-strategy";
import { AuthProcessor } from "./lib/auth-processor";
import { NewProjectProcessor } from "./lib/new-project-processor";
import { BaseDbDialectStrategy } from "./db-dialects/base-db-dialect-strategy";
import { BaseDbPackageStrategy } from "./db-packages/base-db-package-strategy";
import { logError } from "./lib/utils";

const packageStrategyMap: { [key: string]: BaseDbPackageStrategy } = {
  pg: new PgPackageStrategy(),
  "better-sqlite3": new BetterSqlite3PackageStrategy(),
};

const dialectStrategyMap: { [key: string]: BaseDbDialectStrategy } = {
  postgresql: new PostgresqlDialectStrategy(),
  sqlite: new SqliteDialectStrategy(),
};

const program = new Command();

program
  .name("shadriz")
  .description(
    "shadriz - Full Stack Framework Next.js ShadCN/UI and Drizzle ORM"
  )
  .version("0.0.1");

program
  .command("new")
  .description("Create a new project with latest dependencies")
  .argument("<name>", "name of project")
  .action(async (name, options) => {
    try {
      const newProjectProcessor = new NewProjectProcessor(name);
      newProjectProcessor.init();
    } catch (error) {
      console.error("Error running command:", error);
    }
  });

program
  .command("db")
  .description("Generate Drizzle ORM configuration")
  .argument("<strategy>", "pg, mysql2, better-sqlite3")
  .action(async (strategy, options) => {
    if (!(strategy in packageStrategyMap)) {
      console.error(chalk.red(`${strategy} strategy invalid`));
      process.exit(1);
    }
    const packageStrategy = packageStrategyMap[strategy];
    const dialectStrategy = dialectStrategyMap[packageStrategy.dialect];
    await packageStrategy.init();
    dialectStrategy.init();
    dialectStrategy.printInitCompletionMessage();
  });

program
  .command("auth")
  .description("Generate Auth.js configuration")
  .argument("<providers...>", "github, google, credentials")
  .requiredOption("-d, --dialect <dialect>", "postgresql, mysql, sqlite")
  .action(async (providers, options) => {
    if (!(options.dialect in dialectStrategyMap)) {
      logError(`invalid dialect ${options.dialect}`);
      process.exit(1);
    }
    const authScaffold = new AuthProcessor({ providers: providers });
    const dialectStrategy = dialectStrategyMap[options.dialect];
    dialectStrategy.appendAuthSchema();
    dialectStrategy.copyCreateUserScript();
    await authScaffold.init();
  });

program
  .command("scaffold")
  .description(
    "Generate CRUD ui, db schema, db migration, and server actions for a table"
  )
  .argument("<table>", "table: post, product, order, etc")
  .requiredOption("-c, --columns <columns...>", "specify columns")
  .requiredOption("-d, --dialect <dialect>", "postgresql, mysql, sqlite")
  .action(async (table, options) => {
    if (!(options.dialect in dialectStrategyMap)) {
      logError(`invalid dialect: ${options.dialect}`);
      process.exit(1);
    }
    const strategy = dialectStrategyMap[options.dialect];
    strategy.scaffold({ table, columns: options.columns });
  });

program.parse();
